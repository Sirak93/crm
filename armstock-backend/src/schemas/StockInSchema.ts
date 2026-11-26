import { z } from "zod";
import { STOCK_DOCUMENT_MAX_LINES, StockInReason } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";
import { StockDocumentFiltersSchema, DocumentDateSchema, isNotFuture, LineQuantitySchema } from "./StockDocumentSchema";

const StockInLineSchema = z.object({
    productUuid: z.uuid(),
    quantity: LineQuantitySchema,
});

export const StockInBodySchema = z
    .object({
        reason: z.enum(StockInReason),
        date: DocumentDateSchema,
        supplierUuid: z.uuid().nullish().transform((v) => v ?? null),
        invoiceNumber: optionalText(100),
        note: optionalText(1000),
        lines: z.array(StockInLineSchema).min(1).max(STOCK_DOCUMENT_MAX_LINES),
    })
    .refine((body) => isNotFuture(body.date), {
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

export const StockInFiltersSchema = StockDocumentFiltersSchema.extend({
    reason: z.coerce.number().pipe(z.enum(StockInReason)).optional(),
});

export const StockInsQuerySchema = PaginatedSearchQuerySchema.omit({ search: true }).extend(StockInFiltersSchema.shape);

export type StockInBody = z.infer<typeof StockInBodySchema>;
export type StockInLineBody = StockInBody["lines"][number];
export type StockInFilters = z.infer<typeof StockInFiltersSchema>;
export type StockInsQuery = z.infer<typeof StockInsQuerySchema>;
