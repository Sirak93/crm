import { StockOutDepartment, StockOutReason } from 'armstock-shared';

/** In the order shown in the dropdowns. */
export const STOCK_OUT_REASONS = [
  StockOutReason.ISSUED,
  StockOutReason.RETURNED,
  StockOutReason.DAMAGED,
  StockOutReason.EXPIRED,
  StockOutReason.OTHER,
];

export const STOCK_OUT_REASON_LABEL: Record<StockOutReason, string> = {
  [StockOutReason.RETURNED]: 'stockOut.reasons.returned',
  [StockOutReason.ISSUED]: 'stockOut.reasons.issued',
  [StockOutReason.DAMAGED]: 'stockOut.reasons.damaged',
  [StockOutReason.EXPIRED]: 'stockOut.reasons.expired',
  [StockOutReason.OTHER]: 'stockOut.reasons.other',
};

export const STOCK_OUT_DEPARTMENTS = [StockOutDepartment.KITCHEN];

export const STOCK_OUT_DEPARTMENT_LABEL: Record<StockOutDepartment, string> = {
  [StockOutDepartment.KITCHEN]: 'stockOut.departments.kitchen',
};
