import type { ISupplierContactPayload } from "./ISupplierContactPayload";

/** Create and edit body - the contacts list replaces the saved one. */
export interface ISupplierPayload {
    name: string;
    taxId: string | null;
    note: string | null;
    contacts: ISupplierContactPayload[];
}
