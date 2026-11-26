import { z } from "zod";
import { RecipeStatus, STOCK_DOCUMENT_MAX_LINES } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";
import { LineQuantitySchema } from "./StockDocumentSchema";

// Per 1 person; up to 3 decimals for every unit - only the stock-out total is rounded.
const RecipeLineSchema = z.object({
    productUuid: z.uuid(),
    quantity: LineQuantitySchema,
});

export const RecipeBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    note: optionalText(1000),
    lines: z.array(RecipeLineSchema).min(1).max(STOCK_DOCUMENT_MAX_LINES)
        .refine((lines) => new Set(lines.map((l) => l.productUuid)).size === lines.length, {
            message: "a product appears more than once",
        }),
});

export const RecipesQuerySchema = PaginatedSearchQuerySchema.extend({
    status: z.coerce.number().pipe(z.enum(RecipeStatus)).optional(),
});

export const RecipeStatusBodySchema = z.object({
    status: z.enum(RecipeStatus),
});

export type RecipeBody = z.infer<typeof RecipeBodySchema>;
export type RecipesQuery = z.infer<typeof RecipesQuerySchema>;
export type RecipeStatusBody = z.infer<typeof RecipeStatusBodySchema>;
