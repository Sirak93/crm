export interface IAppErrorResponse {
    success: false;
    error: {
        code: string;
        message?: string;
        meta?: unknown;
    };
}
