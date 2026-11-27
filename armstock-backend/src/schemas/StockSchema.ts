import { z } from "zod";
import { PaginatedSearchQuerySchema } from "./SharedSchema";
import { StockDocumentFiltersSchema } from "./StockDocumentSchema";

export const StockBalanceFiltersSchema = z.object({
    search: z.string().trim().max(255).optional(),
    categoryUuid: z.uuid().optional(),
});

export const StockBalanceQuerySchema = PaginatedSearchQuerySchema.extend({
    categoryUuid: z.uuid().optional(),
    // Off also lists products at 0.
    inStockOnly: z.stringbool().default(true),
});

// Only products the kitchen still has, so no "in stock only" switch.
export const KitchenBalanceQuerySchema = PaginatedSearchQuerySchema.extend({
    categoryUuid: z.uuid().optional(),
});

// An empty "from" starts at the first document, an empty "to" ends now.
export const StockMovementQuerySchema = PaginatedSearchQuerySchema.extend({
    categoryUuid: z.uuid().optional(),
    ...StockDocumentFiltersSchema.pick({ dateFrom: true, dateTo: true }).shape,
    // On also lists products with stock but nothing moved in the range.
    withoutMovement: z.stringbool().default(false),
});

export type StockBalanceFilters = z.infer<typeof StockBalanceFiltersSchema>;
export type StockBalanceQuery = z.infer<typeof StockBalanceQuerySchema>;
export type KitchenBalanceQuery = z.infer<typeof KitchenBalanceQuerySchema>;
export type StockMovementQuery = z.infer<typeof StockMovementQuerySchema>;
