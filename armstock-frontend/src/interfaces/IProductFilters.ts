import type { ProductStatus } from 'armstock-shared';

export interface IProductFilters {
  search?: string;
  categoryUuid?: string;
  status?: ProductStatus;
  /** Active products plus archived ones that still have stock. */
  forStockOut?: boolean;
}
