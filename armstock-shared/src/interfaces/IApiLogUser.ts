/** The user behind a log row, resolved for display. */
export interface IApiLogUser {
    uuid: string;
    /** Null for STAFF, who never make requests - kept for the type. */
    email: string | null;
}
