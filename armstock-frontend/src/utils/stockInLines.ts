import type { IStockInLine } from 'armstock-shared';
import type { IStockInLineForm } from '../interfaces/IStockInLineForm';

let nextKey = 0;

export const emptyLine = (): IStockInLineForm => ({
  key: nextKey++,
  productUuid: '',
  product: null,
  quantity: undefined,
  price: undefined,
  total: undefined,
});

export const toLineForm = (line: IStockInLine): IStockInLineForm => ({
  key: nextKey++,
  productUuid: line.productUuid,
  product: {
    uuid: line.productUuid,
    name: line.productName,
    code: line.productCode,
    status: line.productStatus,
    unitShortName: line.unitShortName,
    allowsDecimals: line.allowsDecimals,
  },
  quantity: line.quantity,
  price: line.price,
  total: line.total,
});

export const isLineValid = (line: IStockInLineForm): boolean =>
  !!line.productUuid && !!line.quantity && line.quantity > 0 && line.price !== undefined && line.total !== undefined;
