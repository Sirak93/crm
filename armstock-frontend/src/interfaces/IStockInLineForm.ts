import type { IProductOption } from './IProductOption';

/** One editable row of a stock-in form. */
export interface IStockInLineForm {
  /** Stable v-for key - a new row has no uuid yet. */
  key: number;
  productUuid: string;
  product: IProductOption | null;
  quantity: number | undefined;
  price: number | undefined;
  total: number | undefined;
}
