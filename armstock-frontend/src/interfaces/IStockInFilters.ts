import type { StockInReason } from 'armstock-shared';

export interface IStockInFilters {
  reason?: StockInReason;
  supplierUuid?: string;
  /** ISO date-times, whole days in Armenian time. */
  dateFrom?: string;
  dateTo?: string;
}
