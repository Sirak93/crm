/** The last request a case sent - shown when the case fails. */
export interface IRequestInfo {
    method: string;
    path: string;
    status: number;
    durationMs: number;
}
