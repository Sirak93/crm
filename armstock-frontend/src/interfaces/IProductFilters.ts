import type { ProductStatus } from 'armstock-shared';

export interface IProductFilters {
  search?: string;
  categoryUuid?: string;
  status?: ProductStatus;
  /** Exact match - a scan. */
  barcode?: string;
}
