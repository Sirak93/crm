import type { StockInReason } from "../enums/StockInReason";
import type { INamedRef } from "./INamedRef";

/** A stock-in document header, as shown in the list. */
export interface IStockIn {
    uuid: string;
    /** e.g. "IN-2026-0015" */
    number: string;
    reason: StockInReason;
    date: string;
    supplier: INamedRef | null;
    /** The supplier's own invoice number. */
    invoiceNumber: string | null;
    note: string | null;
    /** Different products in the document - one product on two rows counts once. */
    productCount: number;
    createdBy: INamedRef;
    createdAt: string;
}
