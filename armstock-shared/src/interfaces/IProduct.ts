import type { MeasureUnit } from "../enums/MeasureUnit";
import type { ProductReceivedAs } from "../enums/ProductReceivedAs";
import type { ProductStatus } from "../enums/ProductStatus";
import type { IProductCategory } from "./IProductCategory";

export interface IProduct {
    uuid: string;
    name: string;
    /** Optional code/SKU, unique inside the company. */
    code: string | null;
    /** Optional factory barcode, unique inside the company. */
    barcode: string | null;
    status: ProductStatus;
    measureUnit: MeasureUnit;
    /** Which fields the stock-in line shows - never checked by the backend. */
    receivedAs: ProductReceivedAs;
    category: IProductCategory;
    createdAt: string;
}
