/** Edit body - the measure unit cannot change after create. */
export interface IProductPayload {
    name: string;
    code: string | null;
    categoryUuid: string;
}
