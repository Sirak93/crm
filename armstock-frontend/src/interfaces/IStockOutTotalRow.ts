import type { IStockLineProduct } from 'armstock-shared';

/** One product of the stock-out totals list - what the recipes need and the prefilled total. */
export interface IStockOutTotalRow {
  product: IStockLineProduct;
  /** Recipe amount × persons, summed over the recipes - up to 6 decimals. */
  needed: number;
  /** needed, rounded up so it is never below the recipes' needs; none for a product in no recipe (typed). */
  prefill: number | undefined;
}
