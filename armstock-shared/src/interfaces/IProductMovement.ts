import type { IStockMovement } from "./IStockMovement";
import type { IStockMovementDocument } from "./IStockMovementDocument";

/** One page of a product's movement; `product` has the same numbers as its stock movement row. */
export interface IProductMovement {
    product: IStockMovement;
    documents: IStockMovementDocument[];
}
