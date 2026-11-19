import { z } from "zod";
import {
    MONEY_DECIMALS,
    MONEY_MAX,
    QUANTITY_DECIMALS,
    QUANTITY_MAX,
    STOCK_DOCUMENT_MAX_LINES,
    StockInReason,
} from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";

// The browser sets "now" when the form opens; allow for its clock being a little ahead.
const FUTURE_DATE_GRACE_MS = 5 * 60 * 1000;

const hasMaxDecimals = (decimals: number) => (value: number) => {
    const scaled = value * 10 ** decimals;
    return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

const quantity = z.number().positive().max(QUANTITY_MAX).refine(hasMaxDecimals(QUANTITY_DECIMALS));
const money = z.number().min(0).max(MONEY_MAX).refine(hasMaxDecimals(MONEY_DECIMALS));

const StockInLineSchema = z
    .object({
        productUuid: z.uuid(),
        quantity,
        price: money,
        total: money,
    })
    // Price is rounded to 0.01 when derived from the total, so each unit may be off by up to half of it.
    .refine((line) => Math.abs(line.quantity * line.price - line.total) <= line.quantity * 0.005 + 0.005, {
        path: ["total"],
        message: "total does not match quantity × price",
    });

export const StockInBodySchema = z
    .object({
        reason: z.enum(StockInReason),
        date: z.iso.datetime().transform((value) => new Date(value)),
        supplierUuid: z.uuid().nullish().transform((v) => v ?? null),
        invoiceNumber: optionalText(100),
        note: optionalText(1000),
        lines: z.array(StockInLineSchema).min(1).max(STOCK_DOCUMENT_MAX_LINES),
    })
    .refine((body) => body.date.getTime() <= Date.now() + FUTURE_DATE_GRACE_MS, {
        path: ["date"],
        message: "date is in the future",
    })
    .refine((body) => body.reason !== StockInReason.PURCHASE || body.supplierUuid, {
        path: ["supplierUuid"],
        message: "supplier is required for a purchase",
    })
    .refine((body) => body.reason !== StockInReason.OTHER || body.note, {
        path: ["note"],
        message: "note is required for Other",
    })
    // Supplier fields belong to a purchase only.
    .transform((body) => (body.reason === StockInReason.PURCHASE ? body : { ...body, supplierUuid: null, invoiceNumber: null }));

export const StockInFiltersSchema = z.object({
    reason: z.coerce.number().pipe(z.enum(StockInReason)).optional(),
    supplierUuid: z.uuid().optional(),
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
});

export const StockInsQuerySchema = PaginatedSearchQuerySchema.omit({ search: true }).extend(StockInFiltersSchema.shape);

export type StockInBody = z.infer<typeof StockInBodySchema>;
export type StockInLineBody = StockInBody["lines"][number];
export type StockInFilters = z.infer<typeof StockInFiltersSchema>;
export type StockInsQuery = z.infer<typeof StockInsQuerySchema>;
