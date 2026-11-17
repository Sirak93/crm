import type { ProductStatus } from "../enums/ProductStatus";
import type { IMeasureUnit } from "./IMeasureUnit";
import type { IProductCategory } from "./IProductCategory";

export interface IProduct {
    uuid: string;
    name: string;
    /** Optional code/SKU, unique inside the company. */
    code: string | null;
    status: ProductStatus;
    measureUnit: IMeasureUnit;
    category: IProductCategory;
    createdAt: string;
}
