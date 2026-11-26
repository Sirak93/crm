import type { StockOutDepartment } from "../enums/StockOutDepartment";
import type { StockOutReason } from "../enums/StockOutReason";
import type { IStockOutLinePayload } from "./IStockOutLinePayload";
import type { IStockOutRecipePayload } from "./IStockOutRecipePayload";

export interface IStockOutPayload {
    reason: StockOutReason;
    /** ISO date-time; not in the future. */
    date: string;
    /** Returned only. */
    supplierUuid: string | null;
    /** Issued only. */
    department: StockOutDepartment | null;
    /** Issued only, optional. */
    receiverUuid: string | null;
    /** Required for Other. */
    note: string | null;
    /** Issued only - each recipe once. */
    recipes: IStockOutRecipePayload[];
    /** The totals list: each product once; every recipe product must be in it. */
    lines: IStockOutLinePayload[];
}
