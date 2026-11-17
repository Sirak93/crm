import type { IApiLogCompany } from "./IApiLogCompany";
import type { IApiLogUser } from "./IApiLogUser";

export interface IApiLog {
    uuid: string;
    createdAt: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    slow: boolean;
    success: boolean;
    user: IApiLogUser | null;
    company: IApiLogCompany | null;
    ip: string | null;
    /** Redacted query + body + error - only for failed requests. */
    payload: unknown;
}
