import { z } from "zod";
import { QUANTITY_DECIMALS, QUANTITY_MAX, RECIPE_PERSONS_MAX, STOCK_DOCUMENT_MAX_LINES, StockOutDepartment, StockOutReason } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";
import { StockDocumentFiltersSchema, DocumentDateSchema, hasMaxDecimals, isNotFuture } from "./StockDocumentSchema";

// A total may be 0: listed, but nothing given (the kitchen still has it).
const OutQuantitySchema = z.number().min(0).max(QUANTITY_MAX).refine(hasMaxDecimals(QUANTITY_DECIMALS));

const StockOutLineSchema = z.object({
    productUuid: z.uuid(),
    quantity: OutQuantitySchema,
    extraQuantity: OutQuantitySchema,
});

const StockOutRecipeSchema = z.object({
    recipeUuid: z.uuid(),
    persons: z.number().int().positive().max(RECIPE_PERSONS_MAX),
});

const isEachOnce = (values: string[]) => new Set(values).size === values.length;

const nullableUuid = z.uuid().nullish().transform((v) => v ?? null);

export const StockOutBodySchema = z
    .object({
        reason: z.enum(StockOutReason),
        date: DocumentDateSchema,
        supplierUuid: nullableUuid,
        department: z.enum(StockOutDepartment).nullish().transform((v) => v ?? null),
        receiverUuid: nullableUuid,
        note: optionalText(1000),
        recipes: z.array(StockOutRecipeSchema).max(STOCK_DOCUMENT_MAX_LINES),
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
    .refine((body) => body.reason !== StockOutReason.ISSUED || body.department === StockOutDepartment.KITCHEN, {
        path: ["department"],
        message: "an issue goes to the kitchen",
    })
    .refine((body) => !body.recipes.length || body.reason === StockOutReason.ISSUED, {
        path: ["recipes"],
        message: "recipes are for an issue only",
    })
    .refine((body) => isEachOnce(body.recipes.map((r) => r.recipeUuid)), {
        path: ["recipes"],
        message: "each recipe once",
    })
    .refine((body) => isEachOnce(body.lines.map((l) => l.productUuid)), {
        path: ["lines"],
        message: "each product once",
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
    receiverUuid: z.uuid().optional(),
});

export const StockOutsQuerySchema = PaginatedSearchQuerySchema.omit({ search: true }).extend(StockOutFiltersSchema.shape);

export type StockOutBody = z.infer<typeof StockOutBodySchema>;
export type StockOutFilters = z.infer<typeof StockOutFiltersSchema>;
export type StockOutsQuery = z.infer<typeof StockOutsQuerySchema>;
