import type { SupplierStatus } from "../enums/SupplierStatus";
import type { ISupplierContact } from "./ISupplierContact";

export interface ISupplier {
    uuid: string;
    /** Firm name, unique inside the company. */
    name: string;
    /** ՀՎՀՀ */
    taxId: string | null;
    note: string | null;
    status: SupplierStatus;
    contacts: ISupplierContact[];
    createdAt: string;
}
