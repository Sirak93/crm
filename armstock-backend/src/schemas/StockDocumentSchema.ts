import { z } from "zod";
import { QUANTITY_DECIMALS, QUANTITY_MAX } from "armstock-shared";

// The browser sets "now" when the form opens; allow for its clock being a little ahead.
const FUTURE_DATE_GRACE_MS = 5 * 60 * 1000;

// Round-trip, not value * 10^n: scaling large 6-decimal amounts adds float noise.
export const hasMaxDecimals = (decimals: number) => (value: number) => Number(value.toFixed(decimals)) === value;

export const LineQuantitySchema = z.number().positive().max(QUANTITY_MAX).refine(hasMaxDecimals(QUANTITY_DECIMALS));

export const DocumentDateSchema = z.iso.datetime().transform((value) => new Date(value));

export const isNotFuture = (date: Date): boolean => date.getTime() <= Date.now() + FUTURE_DATE_GRACE_MS;

/** List filters every stock document has. */
export const StockDocumentFiltersSchema = z.object({
    supplierUuid: z.uuid().optional(),
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
});
