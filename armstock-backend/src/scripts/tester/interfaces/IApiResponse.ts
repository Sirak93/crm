export interface IApiResponse<T = any> {
    status: number;
    /** The whole JSON body. */
    body: any;
    /** `body.data` - what the endpoint returned. */
    data: T;
    /** `body.meta` - paging info on lists. */
    meta: any;
}
