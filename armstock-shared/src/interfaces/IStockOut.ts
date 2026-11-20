import type { StockOutDepartment } from "../enums/StockOutDepartment";
import type { StockOutReason } from "../enums/StockOutReason";

/** A stock-out document header, as shown in the list. */
export interface IStockOut {
    uuid: string;
    /** e.g. "OUT-2026-0015" */
    number: string;
    reason: StockOutReason;
    date: string;
    supplierUuid: string | null;
    supplierName: string | null;
    department: StockOutDepartment | null;
    receiverUuid: string | null;
    receiverName: string | null;
    note: string | null;
    /** Different products in the document - one product on two rows counts once. */
    productCount: number;
    createdByUuid: string;
    createdByName: string;
    createdAt: string;
}
