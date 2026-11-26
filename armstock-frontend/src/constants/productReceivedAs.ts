import { ProductReceivedAs } from 'armstock-shared';

/** Dropdown order. */
export const PRODUCT_RECEIVED_AS = [ProductReceivedAs.LOOSE, ProductReceivedAs.PACKS, ProductReceivedAs.LOOSE_OR_PACKS];

export const PRODUCT_RECEIVED_AS_LABEL: Record<ProductReceivedAs, string> = {
  [ProductReceivedAs.LOOSE]: 'products.receivedAs.loose',
  [ProductReceivedAs.PACKS]: 'products.receivedAs.packs',
  [ProductReceivedAs.LOOSE_OR_PACKS]: 'products.receivedAs.looseOrPacks',
};
