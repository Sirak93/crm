import type { IStockLineProduct } from "./IStockLineProduct";

export interface IStockOutLine {
    uuid: string;
    product: IStockLineProduct;
    /** The total given out. */
    quantity: number;
    /** Part typed as an extra (no recipe). */
    extraQuantity: number;
    /** What the document's recipes need of this product, summed - 0 when none. */
    neededQuantity: number;
}
