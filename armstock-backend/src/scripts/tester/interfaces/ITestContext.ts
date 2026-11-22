import type { Http } from "../core/Http";
import type { TestDatabase } from "../core/TestDatabase";
import type { ITestUser } from "./ITestUser";

/** What every side gets before its own setup. Suites never reach for globals. */
export interface ITestContext {
    db: TestDatabase;
    /** No token. */
    anonymous: Http;
    platformOwner: ITestUser;
}
