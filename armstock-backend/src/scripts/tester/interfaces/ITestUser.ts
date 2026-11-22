import type { Http } from "../core/Http";

/** A logged-in account. `api` sends every request with this user's token. */
export interface ITestUser {
    uuid: string;
    email: string;
    /** Random per run, never printed. */
    password: string;
    token: string;
    api: Http;
}
