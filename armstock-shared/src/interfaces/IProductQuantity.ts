import type { MeasureUnit } from "../enums/MeasureUnit";

/** A product name with an amount, for error lists. */
export interface IProductQuantity {
    name: string;
    measureUnit: MeasureUnit;
    quantity: number;
}
