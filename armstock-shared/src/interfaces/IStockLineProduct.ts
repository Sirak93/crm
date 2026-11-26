import type { MeasureUnit } from "../enums/MeasureUnit";
import type { ProductStatus } from "../enums/ProductStatus";

/** The product of a stock document line. */
export interface IStockLineProduct {
    uuid: string;
    name: string;
    code: string | null;
    status: ProductStatus;
    measureUnit: MeasureUnit;
}
