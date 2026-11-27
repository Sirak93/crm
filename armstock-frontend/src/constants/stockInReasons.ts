import type { Component } from 'vue';
import { StockInReason } from 'armstock-shared';
import { Ellipsis, ShoppingCart, Warehouse } from 'lucide-vue-next';

/** In the order shown in the form and the filters. */
export const STOCK_IN_REASONS = [StockInReason.PURCHASE, StockInReason.INITIAL_STOCK, StockInReason.OTHER];

export const STOCK_IN_REASON_ICON: Record<StockInReason, Component> = {
  [StockInReason.PURCHASE]: ShoppingCart,
  [StockInReason.INITIAL_STOCK]: Warehouse,
  [StockInReason.OTHER]: Ellipsis,
};
