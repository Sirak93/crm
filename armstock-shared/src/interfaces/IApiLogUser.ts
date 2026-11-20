/** The user behind a log row, resolved for display. */
export interface IApiLogUser {
    uuid: string;
    /** Null for users without login, who never make requests - kept for the type. */
    email: string | null;
}
