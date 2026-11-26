import type { IStockLineProduct } from "./IStockLineProduct";

/** A recipe line as the stock-out saved it that day - editing the recipe later never changes it. */
export interface IStockOutRecipeLine {
    uuid: string;
    product: IStockLineProduct;
    /** Per 1 person, in the product's own unit. */
    quantity: number;
    /** quantity × persons. */
    neededQuantity: number;
}
