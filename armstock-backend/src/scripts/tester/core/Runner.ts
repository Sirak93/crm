import "dotenv/config";
import bcrypt from "bcrypt";
import { AccountType } from "armstock-shared";
import { BCRYPT_ROUNDS } from "../../../constants/AuthConstants";
import { CaseStatus } from "../enums/CaseStatus";
import { AssertionError } from "./Assert";
import { Http } from "./Http";
import { Reporter } from "./Reporter";
import { TestDatabase } from "./TestDatabase";
import { TestServer } from "./TestServer";
import { login } from "../shared/Accounts";
import { randomPassword, uniqueEmail } from "../shared/Random";
import type { ICaseResult } from "../interfaces/ICaseResult";
import type { ITestContext } from "../interfaces/ITestContext";
import type { ITestSide } from "../interfaces/ITestSide";
import type { ITestSuite } from "../interfaces/ITestSuite";

const DEFAULT_REDIS_DB = "15";

const runSuite = async (suite: ITestSuite, reporter: Reporter): Promise<void> => {
    reporter.startSuite(suite.name);

    for (const testCase of suite.cases) {
        if (testCase.skip) {
            reporter.finishCase({ name: testCase.name, status: CaseStatus.SKIPPED, durationMs: 0 });
            continue;
        }

        Http.clearLastRequest();
        const startedAt = Date.now();
        let result: ICaseResult;
        try {
            await testCase.fn();
            result = { name: testCase.name, status: CaseStatus.PASSED, durationMs: Date.now() - startedAt };
        } catch (error) {
            const assertion = error instanceof AssertionError ? error : null;
            result = {
                name: testCase.name,
                status: CaseStatus.FAILED,
                durationMs: Date.now() - startedAt,
                request: Http.takeLastRequest(),
                error: {
                    message: (error as Error).message || String(error),
                    expected: assertion?.expected,
                    actual: assertion?.actual,
                },
            };
        }
        reporter.finishCase(result);
    }
};

/** The Platform Owner can't be made through the API, so it goes straight into the database. */
const seedPlatformOwner = async (db: TestDatabase, email: string, password: string): Promise<void> => {
    await db.query(
        `INSERT INTO users (email, password, account_type) VALUES ($1, $2, $3)`,
        [email, await bcrypt.hash(password, BCRYPT_ROUNDS), AccountType.PLATFORM_OWNER],
    );
};

const runSide = async (side: ITestSide<any>, reporter: Reporter): Promise<void> => {
    const databaseName = `${process.env.TESTER_DB_NAME || "armstock_tester"}_${side.name.replace(/-/g, "_")}`;
    const db = new TestDatabase(databaseName);
    const server = new TestServer(databaseName, { REDIS_DB: process.env.TESTER_REDIS_DB || DEFAULT_REDIS_DB, ...side.env });

    reporter.startSide(side.name);

    try {
        await db.create();
        await db.buildSchema();

        const ownerEmail = uniqueEmail("platform-owner");
        const ownerPassword = randomPassword();
        await seedPlatformOwner(db, ownerEmail, ownerPassword);

        await side.beforeStart?.();
        await server.start();

        const anonymous = new Http(server.baseUrl);
        const base: ITestContext = { db, anonymous, platformOwner: await login(anonymous, ownerEmail, ownerPassword) };
        const context = await side.setup(base);

        for (const factory of side.suites) await runSuite(factory(context), reporter);
    } catch (error) {
        // A side that can't be set up is one failed case; the other sides still run.
        reporter.startSuite("Setup");
        reporter.finishCase({
            name: `preparing the ${side.name} side`,
            status: CaseStatus.FAILED,
            durationMs: 0,
            request: Http.takeLastRequest(),
            error: {
                message: (error as Error).message,
                expected: error instanceof AssertionError ? error.expected : undefined,
                actual: error instanceof AssertionError ? error.actual : server.logTail() || undefined,
            },
        });
    } finally {
        await server.stop();
        if (process.env.KEEP_DB === "1") {
            process.stdout.write(`\nKEEP_DB=1 - ${databaseName} left in place\n`);
            await db.close();
        } else {
            await db.drop();
        }
    }
};

/** Runs the sides one after another. Exit code 0 only when every case passed. */
export const run = async (sides: ITestSide<any>[]): Promise<void> => {
    const reporter = new Reporter();
    let passed = false;
    try {
        for (const side of sides) await runSide(side, reporter);
        passed = reporter.finish();
    } catch (error) {
        process.stderr.write(`\nrun aborted: ${(error as Error).message}\n`);
        reporter.finish();
    }
    process.exit(passed ? 0 : 1);
};
