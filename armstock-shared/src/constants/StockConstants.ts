/** Matches the DB column: quantity numeric(14,3). */
export const QUANTITY_DECIMALS = 3;

export const QUANTITY_MAX = 99_999_999_999;

/** Matches the DB column: recipe_lines.quantity numeric(14,6) - down to 1 mg in kg. */
export const RECIPE_QUANTITY_DECIMALS = 6;

/** numeric(14,6) leaves 8 digits before the dot. */
export const RECIPE_QUANTITY_MAX = 99_999_999;

/** Most persons one stock-out recipe row can be made for. */
export const RECIPE_PERSONS_MAX = 1_000;

/** Most packs one stock-in line can have. */
export const PACK_COUNT_MAX = 1_000_000;

/** Most lines one stock document can have. */
export const STOCK_DOCUMENT_MAX_LINES = 500;

/** Longest product barcode we accept (real ones are up to ~48 characters). */
export const BARCODE_MAX_LENGTH = 64;
