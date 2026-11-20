import type { IStockLineProduct } from "./IStockLineProduct";

export interface IStockInLine {
    uuid: string;
    product: IStockLineProduct;
    quantity: number;
    /** Price per unit. */
    price: number;
    /** Exact line sum from the invoice; may differ from quantity × price by rounding. */
    total: number;
}
