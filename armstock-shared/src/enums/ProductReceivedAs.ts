/** How a product comes in on stock-in - only decides which fields the stock-in line shows. */
export enum ProductReceivedAs {
    /** Only Quantity (25 kg potatoes). */
    LOOSE = 10,
    /** In one pack × Packs (6 × 500 ml oil). */
    PACKS = 20,
    /** In one pack × Packs, Packs prefilled 1. */
    LOOSE_OR_PACKS = 30,
}
