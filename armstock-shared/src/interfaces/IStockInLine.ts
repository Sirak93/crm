import type { IStockLineProduct } from "./IStockLineProduct";

export interface IStockInLine {
    uuid: string;
    product: IStockLineProduct;
    quantity: number;
}
