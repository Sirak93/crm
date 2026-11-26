import type { MeasureUnit } from "../enums/MeasureUnit";
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
    category: IProductCategory;
    createdAt: string;
}
