import type { MeasureUnit } from "../enums/MeasureUnit";
import type { ProductStatus } from "../enums/ProductStatus";

/** One product's stock over a date range: final = initial + incoming − outgoing. */
export interface IStockMovement {
    uuid: string;
    name: string;
    status: ProductStatus;
    measureUnit: MeasureUnit;
    initial: number;
    incoming: number;
    outgoing: number;
    final: number;
}
