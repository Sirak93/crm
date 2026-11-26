import { MeasureUnitType, ProductReceivedAs } from 'armstock-shared';

/** Dropdown order. */
export const PRODUCT_RECEIVED_AS = [ProductReceivedAs.LOOSE, ProductReceivedAs.PACKS, ProductReceivedAs.LOOSE_OR_PACKS];

export const PRODUCT_RECEIVED_AS_LABEL: Record<ProductReceivedAs, string> = {
  [ProductReceivedAs.LOOSE]: 'products.receivedAs.loose',
  [ProductReceivedAs.PACKS]: 'products.receivedAs.packs',
  [ProductReceivedAs.LOOSE_OR_PACKS]: 'products.receivedAs.looseOrPacks',
};

/** A short example shown in grey next to each option - one per unit type, see UNIT_TYPE_HINT_KEY. */
export const PRODUCT_RECEIVED_AS_HINT: Record<ProductReceivedAs, string> = {
  [ProductReceivedAs.LOOSE]: 'products.receivedAs.looseHint',
  [ProductReceivedAs.PACKS]: 'products.receivedAs.packsHint',
  [ProductReceivedAs.LOOSE_OR_PACKS]: 'products.receivedAs.looseOrPacksHint',
};

/** Which hint example fits the product's unit. */
export const UNIT_TYPE_HINT_KEY: Record<MeasureUnitType, string> = {
  [MeasureUnitType.COUNT]: 'count',
  [MeasureUnitType.WEIGHT]: 'weight',
  [MeasureUnitType.VOLUME]: 'volume',
};
