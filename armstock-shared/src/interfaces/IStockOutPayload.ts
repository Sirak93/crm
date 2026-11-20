import type { StockOutDepartment } from "../enums/StockOutDepartment";
import type { StockOutReason } from "../enums/StockOutReason";
import type { IStockOutLinePayload } from "./IStockOutLinePayload";

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
    lines: IStockOutLinePayload[];
}
