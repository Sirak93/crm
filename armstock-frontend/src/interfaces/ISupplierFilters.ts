import type { SupplierStatus } from 'armstock-shared';

export interface ISupplierFilters {
  search?: string;
  status?: SupplierStatus;
}
