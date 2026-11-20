type ErrorDef = {
    CODE: string;
    STATUS: number;
};

export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    /** Internal diagnostic context - never sent to the client, only to logs. */
    public readonly details?: unknown;
    /** Client-safe data, sent as `error.meta` so the client can build its message. */
    public readonly data?: unknown;

    constructor(error: ErrorDef, overrideStatus?: number, message?: string, details?: unknown, data?: unknown) {
        super(message || error.CODE);

        this.code = error.CODE;
        this.statusCode = overrideStatus ?? error.STATUS;
        this.details = details;
        this.data = data;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
}
