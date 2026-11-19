import type { ProductStatus } from "../enums/ProductStatus";

export interface IStockInLine {
    uuid: string;
    productUuid: string;
    productName: string;
    productCode: string | null;
    productStatus: ProductStatus;
    unitShortName: string;
    allowsDecimals: boolean;
    quantity: number;
    /** Price per unit. */
    price: number;
    /** Exact line sum from the invoice; may differ from quantity × price by rounding. */
    total: number;
}
