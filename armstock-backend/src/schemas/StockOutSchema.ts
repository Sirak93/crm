import { z } from "zod";
import { STOCK_DOCUMENT_MAX_LINES, StockOutDepartment, StockOutReason } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";
import { StockDocumentFiltersSchema, DocumentDateSchema, isNotFuture, LineQuantitySchema } from "./StockDocumentSchema";

const StockOutLineSchema = z.object({
    productUuid: z.uuid(),
    quantity: LineQuantitySchema,
});

const nullableUuid = z.uuid().nullish().transform((v) => v ?? null);

export const StockOutBodySchema = z
    .object({
        reason: z.enum(StockOutReason),
        date: DocumentDateSchema,
        supplierUuid: nullableUuid,
        department: z.enum(StockOutDepartment).nullish().transform((v) => v ?? null),
        receiverUuid: nullableUuid,
        note: optionalText(1000),
        lines: z.array(StockOutLineSchema).min(1).max(STOCK_DOCUMENT_MAX_LINES),
    })
    .refine((body) => isNotFuture(body.date), {
        path: ["date"],
        message: "date is in the future",
    })
    .refine((body) => body.reason !== StockOutReason.RETURNED || body.supplierUuid, {
        path: ["supplierUuid"],
        message: "supplier is required for a return",
    })
    .refine((body) => body.reason !== StockOutReason.ISSUED || body.department, {
        path: ["department"],
        message: "department is required for an issue",
    })
    .refine((body) => body.reason !== StockOutReason.OTHER || body.note, {
        path: ["note"],
        message: "note is required for Other",
    })
    // Supplier belongs to a return only; department and receiver to an issue only.
    .transform((body) => ({
        ...body,
        supplierUuid: body.reason === StockOutReason.RETURNED ? body.supplierUuid : null,
        department: body.reason === StockOutReason.ISSUED ? body.department : null,
        receiverUuid: body.reason === StockOutReason.ISSUED ? body.receiverUuid : null,
    }));

export const StockOutFiltersSchema = StockDocumentFiltersSchema.extend({
    reason: z.coerce.number().pipe(z.enum(StockOutReason)).optional(),
});

export const StockOutsQuerySchema = PaginatedSearchQuerySchema.omit({ search: true }).extend(StockOutFiltersSchema.shape);

export type StockOutBody = z.infer<typeof StockOutBodySchema>;
export type StockOutFilters = z.infer<typeof StockOutFiltersSchema>;
export type StockOutsQuery = z.infer<typeof StockOutsQuerySchema>;
