import type { IStockIn } from "./IStockIn";
import type { IStockInLine } from "./IStockInLine";

/** A stock-in document with its lines, in the order they were typed. */
export interface IStockInDetails extends IStockIn {
    lines: IStockInLine[];
}
