import type { ProductReceivedAs } from "../enums/ProductReceivedAs";

/** Edit body - the measure unit cannot change after create. */
export interface IProductPayload {
    name: string;
    code: string | null;
    barcode: string | null;
    categoryUuid: string;
    receivedAs: ProductReceivedAs;
}
