import type { StockInReason } from "../enums/StockInReason";

/** A stock-in document header, as shown in the list. */
export interface IStockIn {
    uuid: string;
    /** e.g. "IN-2026-0015" */
    number: string;
    reason: StockInReason;
    date: string;
    supplierUuid: string | null;
    supplierName: string | null;
    /** The supplier's own invoice number. */
    invoiceNumber: string | null;
    note: string | null;
    /** Sum of the line totals. */
    total: number;
    /** Different products in the document - one product on two rows counts once. */
    productCount: number;
    createdByUuid: string;
    createdByName: string;
    createdAt: string;
}
