import type { StockInReason } from 'armstock-shared';

export interface IStockInFilters {
  reason?: StockInReason;
  supplierUuid?: string;
  /** ISO date-times, whole days in the browser's time zone. */
  dateFrom?: string;
  dateTo?: string;
}
