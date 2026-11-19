import { StockInReason } from 'armstock-shared';

/** Dropdown order. */
export const STOCK_IN_REASONS = [StockInReason.PURCHASE, StockInReason.INITIAL_STOCK, StockInReason.OTHER];

export const STOCK_IN_REASON_LABEL: Record<StockInReason, string> = {
  [StockInReason.PURCHASE]: 'stockIn.reasons.purchase',
  [StockInReason.INITIAL_STOCK]: 'stockIn.reasons.initialStock',
  [StockInReason.OTHER]: 'stockIn.reasons.other',
};
