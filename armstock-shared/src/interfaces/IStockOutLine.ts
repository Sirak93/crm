import type { ProductStatus } from "../enums/ProductStatus";

export interface IStockOutLine {
    uuid: string;
    productUuid: string;
    productName: string;
    productCode: string | null;
    productStatus: ProductStatus;
    unitShortName: string;
    allowsDecimals: boolean;
    quantity: number;
}
