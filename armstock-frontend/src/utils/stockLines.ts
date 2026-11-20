import type { IProduct, IStockLineProduct } from 'armstock-shared';

let nextKey = 0;

/** Stable v-for key for a form row - a new row has no uuid yet. */
export const nextLineKey = (): number => nextKey++;

export const toLineProduct = (product: IProduct): IStockLineProduct => ({
  uuid: product.uuid,
  name: product.name,
  code: product.code,
  status: product.status,
  unitShortName: product.measureUnit.shortName,
  allowsDecimals: product.measureUnit.allowsDecimals,
});
