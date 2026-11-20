import type { SupplierStatus } from "../enums/SupplierStatus";

/** A supplier offered in a picker or filter. */
export interface ISupplierOption {
    uuid: string;
    name: string;
    status: SupplierStatus;
}
