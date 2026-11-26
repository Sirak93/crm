/** Matches the DB column: quantity numeric(14,3). */
export const QUANTITY_DECIMALS = 3;

export const QUANTITY_MAX = 99_999_999_999;

/** Most packs one stock-in line can have. */
export const PACK_COUNT_MAX = 1_000_000;

/** Most lines one stock document can have. */
export const STOCK_DOCUMENT_MAX_LINES = 500;

/** Longest product barcode we accept (real ones are up to ~48 characters). */
export const BARCODE_MAX_LENGTH = 64;
