import { MEASURE_UNITS, QUANTITY_DECIMALS, type IProduct, type IStockLineProduct } from 'armstock-shared';
import type { IStockOutLineForm } from '../interfaces/IStockOutLineForm';

let nextKey = 0;

/** Stable v-for key for a form row - a new row has no uuid yet. */
export const nextLineKey = (): number => nextKey++;

export const toLineProduct = (product: IProduct): IStockLineProduct => ({
  uuid: product.uuid,
  name: product.name,
  code: product.code,
  status: product.status,
  measureUnit: product.measureUnit,
});

/** Decimals a line's quantity may have - none for a whole-number unit. */
export const quantityPrecision = (product: IStockLineProduct | null): number =>
  product && !MEASURE_UNITS[product.measureUnit].allowsDecimals ? 0 : QUANTITY_DECIMALS;

type ScannableLine<K extends string> = Pick<IStockOutLineForm, 'productUuid' | 'product'> & Record<K, number | undefined>;

/**
 * A scanned product, like 1C: +1 on its row, else it fills the first empty row or a new one at the bottom.
 * `countKey` is what a scan adds 1 to - the quantity, or the pack count on a stock-in.
 */
export const withScannedProduct = <K extends string, T extends ScannableLine<K>>(
  lines: T[],
  product: IStockLineProduct,
  newLine: () => T,
  countKey: K,
): { lines: T[]; line: T } => {
  const existing = lines.find((l) => l.productUuid === product.uuid);
  if (existing) {
    (existing as Record<K, number | undefined>)[countKey] = (existing[countKey] ?? 0) + 1;
    return { lines, line: existing };
  }
  const empty = lines.find((l) => !l.productUuid);
  const line = empty ?? newLine();
  Object.assign(line, { productUuid: product.uuid, product, [countKey]: 1 });
  return { lines: empty ? lines : [...lines, line], line };
};
