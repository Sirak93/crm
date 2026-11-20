import type { IStockOut } from "./IStockOut";
import type { IStockOutLine } from "./IStockOutLine";

/** A stock-out document with its lines, in the order they were typed. */
export interface IStockOutDetails extends IStockOut {
    lines: IStockOutLine[];
}
