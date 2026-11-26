import type { IStockInPack } from "./IStockInPack";
import type { IStockLineProduct } from "./IStockLineProduct";

/** pack.quantity × pack.count = quantity (total). */
export interface IStockInLine {
    uuid: string;
    product: IStockLineProduct;
    pack: IStockInPack;
    /** The total, in the product's unit - what stock counts. */
    quantity: number;
}
