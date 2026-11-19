export interface ISupplierContact {
    uuid: string;
    name: string;
    /** Free text, e.g. Manager or Driver. */
    position: string | null;
    phone: string | null;
    note: string | null;
}
