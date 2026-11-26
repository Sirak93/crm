import { ProductReceivedAs, QUANTITY_DECIMALS, type IStockInLine } from 'armstock-shared';
import type { IStockInLineForm } from '../interfaces/IStockInLineForm';
import { nextLineKey } from './stockLines';

export const emptyLine = (): IStockInLineForm => ({
  key: nextLineKey(),
  productUuid: '',
  product: null,
  pack: { quantity: undefined, unit: null, count: 1 },
  keepsPacks: false,
});

export const toLineForm = (line: IStockInLine): IStockInLineForm => ({
  key: nextLineKey(),
  productUuid: line.product.uuid,
  product: line.product,
  pack: { ...line.pack },
  keepsPacks: line.pack.count > 1,
});

/** Loose → only Quantity; otherwise In one pack × Packs. No product yet counts as Loose (new products start on it). */
export const usesPacks = (line: IStockInLineForm): boolean =>
  line.keepsPacks || (!!line.product && line.product.receivedAs !== ProductReceivedAs.LOOSE);

/** In one pack × Packs, as the backend works it out; undefined until both are typed. */
export const lineTotal = ({ pack }: IStockInLineForm): number | undefined =>
  pack.quantity && pack.count ? Number((pack.quantity * pack.count).toFixed(QUANTITY_DECIMALS)) : undefined;

export const isLineValid = ({ productUuid, pack }: IStockInLineForm): boolean =>
  !!productUuid && pack.unit !== null && !!pack.quantity && pack.quantity > 0 && !!pack.count && pack.count > 0;
