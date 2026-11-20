import type { IStockLineProduct } from 'armstock-shared';

/** One editable row of a stock-out form. */
export interface IStockOutLineForm {
  /** Stable v-for key - a new row has no uuid yet. */
  key: number;
  productUuid: string;
  product: IStockLineProduct | null;
  quantity: number | undefined;
}
