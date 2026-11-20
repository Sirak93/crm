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
    /** Average of all stock-in prices; null when the product never came in. */
    avgPrice: number | null;
    /** quantity × average price. */
    value: number;
}
