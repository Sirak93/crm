import type { CaseStatus } from "../enums/CaseStatus";
import type { ICaseError } from "./ICaseError";
import type { IRequestInfo } from "./IRequestInfo";

export interface ICaseResult {
    name: string;
    status: CaseStatus;
    durationMs: number;
    error?: ICaseError;
    request?: IRequestInfo;
}
