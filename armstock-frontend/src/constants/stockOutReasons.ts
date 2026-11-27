import type { Component } from 'vue';
import { StockOutDepartment, StockOutReason } from 'armstock-shared';
import { CalendarX, Ellipsis, HandPlatter, TriangleAlert, Undo2 } from 'lucide-vue-next';

/** In the order shown in the form and the filters. */
export const STOCK_OUT_REASONS = [
  StockOutReason.ISSUED,
  StockOutReason.RETURNED,
  StockOutReason.DAMAGED,
  StockOutReason.EXPIRED,
  StockOutReason.OTHER,
];

export const STOCK_OUT_REASON_ICON: Record<StockOutReason, Component> = {
  [StockOutReason.ISSUED]: HandPlatter,
  [StockOutReason.RETURNED]: Undo2,
  [StockOutReason.DAMAGED]: TriangleAlert,
  [StockOutReason.EXPIRED]: CalendarX,
  [StockOutReason.OTHER]: Ellipsis,
};

export const STOCK_OUT_DEPARTMENTS = [StockOutDepartment.KITCHEN];
