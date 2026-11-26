import type { StockOutDepartment } from "../enums/StockOutDepartment";
import type { StockOutReason } from "../enums/StockOutReason";
import type { INamedRef } from "./INamedRef";

/** A stock-out document header, as shown in the list. */
export interface IStockOut {
    uuid: string;
    /** e.g. "OUT-2026-0015" */
    number: string;
    reason: StockOutReason;
    date: string;
    supplier: INamedRef | null;
    department: StockOutDepartment | null;
    receiver: INamedRef | null;
    note: string | null;
    /** Different products in the document - one product on two rows counts once. */
    productCount: number;
    /** Made with recipes - shown as "By recipe" in the list. */
    hasRecipes: boolean;
    createdBy: INamedRef;
    createdAt: string;
}
