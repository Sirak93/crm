import type { IProduct, IStockLineProduct } from 'armstock-shared';
import type { IScanCount } from '../interfaces/IScanCount';
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
  receivedAs: product.receivedAs,
});

type ScannableLine = Pick<IStockOutLineForm, 'productUuid' | 'product'>;

/** A scanned product, like 1C: +1 on its row, else it fills the first empty row or a new one at the bottom. */
export const withScannedProduct = <T extends ScannableLine>(
  lines: T[],
  product: IStockLineProduct,
  newLine: () => T,
  count: IScanCount<T>,
): { lines: T[]; line: T } => {
  const existing = lines.find((l) => l.productUuid === product.uuid);
  if (existing) {
    count.set(existing, (count.get(existing) ?? 0) + 1);
    return { lines, line: existing };
  }
  const empty = lines.find((l) => !l.productUuid);
  const line = empty ?? newLine();
  Object.assign(line, { productUuid: product.uuid, product });
  count.set(line, 1);
  return { lines: empty ? lines : [...lines, line], line };
};
