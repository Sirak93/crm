import type { IStockLineProduct } from "./IStockLineProduct";

export interface IStockOutLine {
    uuid: string;
    product: IStockLineProduct;
    quantity: number;
}
