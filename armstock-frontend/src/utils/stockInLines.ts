import { QUANTITY_DECIMALS, type IStockInLine } from 'armstock-shared';
import type { IStockInLineForm } from '../interfaces/IStockInLineForm';
import { nextLineKey } from './stockLines';

export const emptyLine = (): IStockInLineForm => ({
  key: nextLineKey(),
  productUuid: '',
  product: null,
  packQuantity: undefined,
  packUnit: null,
  packCount: 1,
});

export const toLineForm = (line: IStockInLine): IStockInLineForm => ({
  key: nextLineKey(),
  productUuid: line.product.uuid,
  product: line.product,
  packQuantity: line.packQuantity,
  packUnit: line.packUnit,
  packCount: line.packCount,
});

/** Amount × Count, as the backend works it out; undefined until both are typed. */
export const lineTotal = (line: Pick<IStockInLineForm, 'packQuantity' | 'packCount'>): number | undefined =>
  line.packQuantity && line.packCount ? Number((line.packQuantity * line.packCount).toFixed(QUANTITY_DECIMALS)) : undefined;

export const isLineValid = (line: IStockInLineForm): boolean =>
  !!line.productUuid && line.packUnit !== null && !!line.packQuantity && line.packQuantity > 0 && !!line.packCount && line.packCount > 0;
