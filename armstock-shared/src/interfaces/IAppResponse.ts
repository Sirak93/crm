export interface IAppResponse<T> {
    success: boolean;
    data?: T;
    meta?: unknown;
}
