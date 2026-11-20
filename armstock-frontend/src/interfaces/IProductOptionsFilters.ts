export interface IProductOptionsFilters {
  search?: string;
  /** Active products plus archived ones that still have stock. */
  forStockOut?: boolean;
  /** Only products that came in from this supplier. */
  suppliedBy?: string;
  /** Exact match - a scan. */
  barcode?: string;
}
