import { z } from "zod";
import { PaginatedSearchQuerySchema } from "./SharedSchema";

export const StockBalanceFiltersSchema = z.object({
    search: z.string().trim().max(255).optional(),
    categoryUuid: z.uuid().optional(),
});

export const StockBalanceQuerySchema = PaginatedSearchQuerySchema.extend({
    categoryUuid: z.uuid().optional(),
    // Off also lists products at 0.
    inStockOnly: z.stringbool().default(true),
});

export type StockBalanceFilters = z.infer<typeof StockBalanceFiltersSchema>;
export type StockBalanceQuery = z.infer<typeof StockBalanceQuerySchema>;
