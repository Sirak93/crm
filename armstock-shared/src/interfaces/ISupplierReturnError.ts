import type { IProductQuantity } from "./IProductQuantity";

/**
 * `error.meta` of the supplier-return errors. For a too-big return each quantity is what can
 * still be returned; for a stock-in edit/delete it is what was already returned.
 */
export interface ISupplierReturnError {
    supplierName: string;
    products: IProductQuantity[];
}
