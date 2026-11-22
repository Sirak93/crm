import type { StockOutReason } from 'armstock-shared';

export interface IStockOutFilters {
  reason?: StockOutReason;
  supplierUuid?: string;
  receiverUuid?: string;
  /** ISO date-times, whole days in the browser's time zone. */
  dateFrom?: string;
  dateTo?: string;
}
