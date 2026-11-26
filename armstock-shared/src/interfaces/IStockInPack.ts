import type { MeasureUnit } from "../enums/MeasureUnit";

/** One pack of a stock-in line: In one pack × Packs. */
export interface IStockInPack {
    /** One pack's amount, in the product's unit. */
    quantity: number;
    /** The unit the amount was typed in - for showing only; same type as the product's unit. */
    unit: MeasureUnit;
    count: number;
}
