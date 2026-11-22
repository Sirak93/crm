import { ErrorCodes, type IApiLog, type IDatabaseStorage } from "armstock-shared";
import { REDACTED } from "../../../../utils/redactSecrets";
import { defineSuite } from "../../core/Suite";
import { AssertionError, anyDate, equals, isTrue, matches } from "../../core/Assert";
import { createCompany } from "../../shared/Companies";
import { PATHS } from "../../shared/Paths";
import { randomPassword, uniqueEmail, uniqueName } from "../../shared/Random";
import type { ITestCompany } from "../../interfaces/ITestCompany";
import type { ITestContext } from "../../interfaces/ITestContext";

const WAIT_STEP_MS = 100;
const WAIT_STEPS = 30;

/** Log rows are written after the response goes out, so a case waits for them. */
export default (context: ITestContext) => defineSuite("Platform: database and logs", (test) => {
    const { db, anonymous, platformOwner } = context;
    const api = platformOwner.api;
    const tag = uniqueName("Logs").replace(" ", "");
    let company: ITestCompany;

    /** The log rows for `params` that `match` - waits until at least one shows up. */
    const logsFor = async (params: string, match: (log: IApiLog) => boolean = () => true): Promise<IApiLog[]> => {
        for (let step = 0; step < WAIT_STEPS; step++) {
            const { data } = await api.ok<IApiLog[]>("GET", `${PATHS.PLATFORM_LOGS}?pageSize=100&${params}`);
            const found = data.filter(match);
            if (found.length) return found;
            await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
        }
        throw new AssertionError(`no matching log row for "${params}" after ${WAIT_STEPS * WAIT_STEP_MS}ms`, "at least one", 0);
    };

    // --- Database storage ---

    test("storage: the scratch database with its tables, and totals that add up", async () => {
        const { data } = await api.ok<IDatabaseStorage>("GET", PATHS.PLATFORM_STORAGE);
        equals(data.databaseName, db.name, "database name");
        const tables = data.tables.map((t) => t.table);
        for (const table of ["users", "companies", "products", "stock_ins", "api_logs"]) isTrue(tables.includes(table), `lists ${table}`);
        equals(data.tableCount, data.tables.length, "table count");
        equals(data.totalTableSizeBytes, data.tables.reduce((sum, t) => sum + t.totalSizeBytes, 0), "total size");
        isTrue(data.totalTableSizeBytes <= data.databaseSizeBytes, "tables fit in the database size");
        for (const t of data.tables) {
            equals(t.tableSizeBytes + t.indexSizeBytes + t.toastSizeBytes, t.totalSizeBytes, `${t.table} parts add up`);
        }
        matches(data, { generatedAt: anyDate });
    });

    // --- Logs ---

    test("a successful request is logged with its user and company, and no payload", async () => {
        company = await createCompany(context, "Logs");
        await company.storekeeper.api.ok("GET", `${PATHS.PRODUCTS}?search=${tag}`);
        // The path is stored without the query string.
        const [log] = await logsFor(`path=${encodeURIComponent(PATHS.PRODUCTS)}`, (l) => l.user?.uuid === company.storekeeper.uuid);
        matches(log, {
            path: PATHS.PRODUCTS,
            method: "GET",
            statusCode: 200,
            success: true,
            slow: false,
            // Emails are stored lowercased.
            user: { uuid: company.storekeeper.uuid, email: company.storekeeper.email.toLowerCase() },
            company: { uuid: company.uuid, name: company.name },
            payload: null,
            createdAt: anyDate,
        });
    });

    test("a failed request is logged with its payload - secrets masked, also in the database", async () => {
        const email = uniqueEmail(tag.toLowerCase());
        const password = randomPassword();
        await anonymous.rejects("POST", PATHS.LOGIN, ErrorCodes.AUTH.INVALID_CREDENTIALS, { email, password });
        await anonymous.rejects("POST", PATHS.REFRESH, ErrorCodes.AUTH.UNAUTHORIZED, { refreshToken: `${tag}-token` });

        const [loginLog] = await logsFor(`path=${encodeURIComponent(PATHS.LOGIN)}&success=false`, (l) => (l.payload as any)?.body?.email === email);
        matches(loginLog, { statusCode: ErrorCodes.AUTH.INVALID_CREDENTIALS.STATUS, success: false, user: null, payload: { body: { email, password: REDACTED } } });
        const [refreshLog] = await logsFor(`path=${encodeURIComponent(PATHS.REFRESH)}&success=false`);
        matches(refreshLog, { payload: { body: { refreshToken: REDACTED } } });

        const leaked = await db.query("SELECT uuid FROM api_logs WHERE payload::text LIKE $1 OR payload::text LIKE $2",
            [`%${password}%`, `%${tag}-token%`]);
        matches(leaked, [], "no log row holds the password or the token");
    });

    test("filters: method, success, slow, path, date; paging; bad query", async () => {
        const posts = await logsFor("method=post");
        isTrue(posts.every((l) => l.method === "POST"), "method filter (case-insensitive input)");
        const failed = await logsFor("success=false");
        isTrue(failed.every((l) => !l.success), "success filter");
        matches((await api.ok<IApiLog[]>("GET", `${PATHS.PLATFORM_LOGS}?slow=true`)).data, [], "nothing is slow here");

        const future = encodeURIComponent(new Date(Date.now() + 60_000).toISOString());
        matches((await api.ok<IApiLog[]>("GET", `${PATHS.PLATFORM_LOGS}?dateFrom=${future}`)).data, [], "nothing in the future");

        // A request from just now is inside "the last minute" and outside "until a minute ago".
        const minuteAgo = encodeURIComponent(new Date(Date.now() - 60_000).toISOString());
        await company.owner.api.ok("GET", PATHS.AUTH_USER);
        const isFresh = (l: IApiLog) => l.user?.uuid === company.owner.uuid && l.path === PATHS.AUTH_USER;
        await logsFor(`dateFrom=${minuteAgo}&path=${encodeURIComponent(PATHS.AUTH_USER)}`, isFresh);
        const before = (await api.ok<IApiLog[]>("GET", `${PATHS.PLATFORM_LOGS}?pageSize=100&dateTo=${minuteAgo}`)).data;
        isTrue(!before.some(isFresh), "a request from just now is not before a minute ago");

        const total = await db.count("api_logs");
        const page = await api.ok<IApiLog[]>("GET", `${PATHS.PLATFORM_LOGS}?page=1&pageSize=5`);
        isTrue(page.meta.total >= total, "total counts every row");
        equals(page.data.length, 5, "items on page 1");
        const dates = page.data.map((l) => Date.parse(l.createdAt));
        matches(dates, [...dates].sort((a, b) => b - a), "newest first");

        await api.rejectsField("GET", `${PATHS.PLATFORM_LOGS}?pageSize=101`, "pageSize");
        await api.rejectsField("GET", `${PATHS.PLATFORM_LOGS}?slow=maybe`, "slow");
        await api.rejectsField("GET", `${PATHS.PLATFORM_LOGS}?dateFrom=yesterday`, "dateFrom");
    });

    test("only the Platform Owner: company users and no token are refused", async () => {
        for (const url of [PATHS.PLATFORM_LOGS, PATHS.PLATFORM_STORAGE]) {
            await company.owner.api.rejects("GET", url, ErrorCodes.AUTH.FORBIDDEN);
            await anonymous.rejects("GET", url, ErrorCodes.AUTH.UNAUTHORIZED);
        }
        await company.owner.api.rejects("DELETE", PATHS.PLATFORM_LOGS, ErrorCodes.AUTH.FORBIDDEN);
        isTrue(await db.count("api_logs") > 0, "a company user can't clear the logs");
    });

    test("clear removes every log row", async () => {
        const [{ now }] = await db.query<{ now: Date }>("SELECT now() AS now");
        await api.ok("DELETE", PATHS.PLATFORM_LOGS);
        // Rows written after the clear started (e.g. the clear request itself) may be there.
        equals(await db.count("api_logs", "created_at < $1", [now]), 0, "rows from before the clear");
    });
});
