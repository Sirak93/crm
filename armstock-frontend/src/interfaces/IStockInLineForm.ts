import type { IStockLineProduct } from 'armstock-shared';
import type { IStockInPackForm } from './IStockInPackForm';

/** One editable row of a stock-in form: In one pack × Packs = Total. */
export interface IStockInLineForm {
  /** Stable v-for key - a new row has no uuid yet. */
  key: number;
  productUuid: string;
  product: IStockLineProduct | null;
  pack: IStockInPackForm;
  /** A row that has had Packs > 1 (an old doc, a scan) keeps its pack fields, even for a Loose product. */
  keepsPacks: boolean;
}
