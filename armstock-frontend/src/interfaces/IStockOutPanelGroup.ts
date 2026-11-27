import type { IStockLineProduct } from 'armstock-shared';

/** One group of the stock-out summary panel - a recipe row, or the extra products. */
export interface IStockOutPanelGroup {
  key: string;
  name: string;
  /** Set for a recipe group; its amounts show in the recipe's small unit (g, ml). */
  persons?: number;
  lines: { key: string; product: IStockLineProduct; quantity: number }[];
}
