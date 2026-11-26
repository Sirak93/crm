import type { IStockOut } from "./IStockOut";
import type { IStockOutLine } from "./IStockOutLine";
import type { IStockOutRecipe } from "./IStockOutRecipe";

/** A stock-out document with its recipe rows and lines, in the order they were typed. */
export interface IStockOutDetails extends IStockOut {
    recipes: IStockOutRecipe[];
    lines: IStockOutLine[];
}
