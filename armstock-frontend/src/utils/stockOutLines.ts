import type { IStockOutLine } from 'armstock-shared';
import type { IStockOutLineForm } from '../interfaces/IStockOutLineForm';
import { nextLineKey } from './stockLines';

export const emptyOutLine = (): IStockOutLineForm => ({
  key: nextLineKey(),
  productUuid: '',
  product: null,
  quantity: undefined,
});

/** Also fills recipe lines - same product + quantity row. */
export const toOutLineForm = (line: Pick<IStockOutLine, 'product' | 'quantity'>): IStockOutLineForm => ({
  key: nextLineKey(),
  productUuid: line.product.uuid,
  product: line.product,
  quantity: line.quantity,
});

export const isOutLineValid = (line: IStockOutLineForm): boolean => !!line.productUuid && !!line.quantity && line.quantity > 0;
