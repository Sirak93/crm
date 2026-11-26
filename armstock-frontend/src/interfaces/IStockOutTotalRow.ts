import type { IStockLineProduct } from 'armstock-shared';

/** One product of the stock-out totals list - what the recipes need, what was typed as extra, and the prefilled total. */
export interface IStockOutTotalRow {
  product: IStockLineProduct;
  /** Recipe amount × persons, summed over the recipes - up to 6 decimals. */
  needed: number;
  extra: number;
  /** needed + extra, rounded up so it is never below the recipes' needs. */
  prefill: number;
}
