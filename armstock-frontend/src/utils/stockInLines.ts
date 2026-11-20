import type { IStockInLine } from 'armstock-shared';
import type { IStockInLineForm } from '../interfaces/IStockInLineForm';
import { nextLineKey } from './stockLines';

export const emptyLine = (): IStockInLineForm => ({
  key: nextLineKey(),
  productUuid: '',
  product: null,
  quantity: undefined,
  price: undefined,
  total: undefined,
});

export const toLineForm = (line: IStockInLine): IStockInLineForm => ({
  key: nextLineKey(),
  productUuid: line.product.uuid,
  product: line.product,
  quantity: line.quantity,
  price: line.price,
  total: line.total,
});

export const isLineValid = (line: IStockInLineForm): boolean =>
  !!line.productUuid && !!line.quantity && line.quantity > 0 && line.price !== undefined && line.total !== undefined;
