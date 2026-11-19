import type { StockInReason } from "../enums/StockInReason";
import type { IStockInLinePayload } from "./IStockInLinePayload";

export interface IStockInPayload {
    reason: StockInReason;
    /** ISO date-time; not in the future. */
    date: string;
    /** Purchase only. */
    supplierUuid: string | null;
    /** Purchase only. */
    invoiceNumber: string | null;
    /** Required for Other. */
    note: string | null;
    lines: IStockInLinePayload[];
}
