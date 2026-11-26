import type { MeasureUnit } from 'armstock-shared';

/** The pack fields of a stock-in form row - empty until typed. */
export interface IStockInPackForm {
  /** One pack's amount, in the product's unit. */
  quantity: number | undefined;
  /** The unit the amount is typed in; null until a product is picked. */
  unit: MeasureUnit | null;
  count: number | undefined;
}
