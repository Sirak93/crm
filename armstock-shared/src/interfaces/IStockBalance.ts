import type { ProductStatus } from "../enums/ProductStatus";

/** One product's stock right now. */
export interface IStockBalance {
    uuid: string;
    name: string;
    code: string | null;
    status: ProductStatus;
    categoryName: string;
    unitShortName: string;
    quantity: number;
}
