import type { IStockLineProduct, MeasureUnit } from 'armstock-shared';

/** One editable row of a stock-in form: Amount × Count = Total. */
export interface IStockInLineForm {
  /** Stable v-for key - a new row has no uuid yet. */
  key: number;
  productUuid: string;
  product: IStockLineProduct | null;
  /** One pack's amount, in the product's unit. */
  packQuantity: number | undefined;
  /** The unit the amount is typed in; null until a product is picked. */
  packUnit: MeasureUnit | null;
  packCount: number | undefined;
}
