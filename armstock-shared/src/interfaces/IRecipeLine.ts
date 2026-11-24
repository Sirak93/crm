import type { IStockLineProduct } from "./IStockLineProduct";

export interface IRecipeLine {
    uuid: string;
    product: IStockLineProduct;
    /** Per 1 person, in the product's own unit. */
    quantity: number;
}
