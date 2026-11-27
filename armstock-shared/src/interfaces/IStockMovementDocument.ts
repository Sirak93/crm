import type { StockDocumentType } from "../enums/StockDocumentType";
import type { StockInReason } from "../enums/StockInReason";
import type { StockOutReason } from "../enums/StockOutReason";
import type { IStockMovementRecipe } from "./IStockMovementRecipe";

/** One stock document of one product's movement. */
export interface IStockMovementDocument {
    uuid: string;
    type: StockDocumentType;
    /** e.g. "IN-2026-0012" */
    number: string;
    reason: StockInReason | StockOutReason;
    date: string;
    incoming: number;
    outgoing: number;
    /** Stock right after this document. */
    stockAfter: number;
    /** Empty unless the stock-out was made with recipes that used this product. */
    recipes: IStockMovementRecipe[];
}
