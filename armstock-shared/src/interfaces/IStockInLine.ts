import type { MeasureUnit } from "../enums/MeasureUnit";
import type { IStockLineProduct } from "./IStockLineProduct";

/** Amount × Count = Total (quantity). */
export interface IStockInLine {
    uuid: string;
    product: IStockLineProduct;
    /** One pack's amount, in the product's unit. */
    packQuantity: number;
    /** The unit the amount was typed in - for showing only. */
    packUnit: MeasureUnit;
    packCount: number;
    /** The total, in the product's unit - what stock counts. */
    quantity: number;
}
