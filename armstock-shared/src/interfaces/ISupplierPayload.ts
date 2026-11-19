/** Firm fields only - contacts have their own endpoints. */
export interface ISupplierPayload {
    name: string;
    taxId: string | null;
    note: string | null;
}
