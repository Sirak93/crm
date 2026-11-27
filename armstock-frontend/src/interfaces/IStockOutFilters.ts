import type { StockOutReason } from 'armstock-shared';

export interface IStockOutFilters {
  reason?: StockOutReason;
  supplierUuid?: string;
  receiverUuid?: string;
  /** ISO date-times, whole days in Armenian time. */
  dateFrom?: string;
  dateTo?: string;
}
