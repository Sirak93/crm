import { z } from "zod";
import { MeasureUnit, PACK_COUNT_MAX, QUANTITY_DECIMALS, QUANTITY_MAX, STOCK_DOCUMENT_MAX_LINES, StockInReason } from "armstock-shared";
import { ExportLangSchema, optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";
import { StockDocumentFiltersSchema, DocumentDateSchema, isNotFuture, LineQuantitySchema } from "./StockDocumentSchema";

const StockInLineSchema = z
    .object({
        productUuid: z.uuid(),
        pack: z.object({
            quantity: LineQuantitySchema,
            unit: z.enum(MeasureUnit),
            count: z.number().int().positive().max(PACK_COUNT_MAX),
        }),
    })
    .transform((line) => ({ ...line, quantity: Number((line.pack.quantity * line.pack.count).toFixed(QUANTITY_DECIMALS)) }))
    .refine((line) => line.quantity <= QUANTITY_MAX, { path: ["pack", "count"], message: "total is too big" });

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

export const StockInExportQuerySchema = StockInFiltersSchema.extend(ExportLangSchema.shape);

export type StockInBody = z.infer<typeof StockInBodySchema>;
export type StockInLineBody = StockInBody["lines"][number];
export type StockInFilters = z.infer<typeof StockInFiltersSchema>;
export type StockInsQuery = z.infer<typeof StockInsQuerySchema>;
export type StockInExportQuery = z.infer<typeof StockInExportQuerySchema>;
