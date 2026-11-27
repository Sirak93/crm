import { z } from "zod";
import { LOCALE, PRODUCT_MOVEMENT_PAGE_SIZE } from "armstock-shared";
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

// The Excel files: all rows, texts in the app language the user has chosen.
const ExportLangSchema = z.object({ lang: z.enum(LOCALE) });

export const StockMovementExportQuerySchema = StockMovementQuerySchema.omit({ page: true, pageSize: true }).extend(ExportLangSchema.shape);

// One product's documents; same range as the movement table.
export const ProductMovementQuerySchema = PaginatedSearchQuerySchema.pick({ page: true, pageSize: true }).extend({
    pageSize: PaginatedSearchQuerySchema.shape.pageSize.unwrap().default(PRODUCT_MOVEMENT_PAGE_SIZE),
    ...StockDocumentFiltersSchema.pick({ dateFrom: true, dateTo: true }).shape,
});

export const ProductMovementExportQuerySchema = StockDocumentFiltersSchema.pick({ dateFrom: true, dateTo: true }).extend(ExportLangSchema.shape);

export type StockBalanceFilters = z.infer<typeof StockBalanceFiltersSchema>;
export type StockBalanceQuery = z.infer<typeof StockBalanceQuerySchema>;
export type KitchenBalanceQuery = z.infer<typeof KitchenBalanceQuerySchema>;
export type StockMovementQuery = z.infer<typeof StockMovementQuerySchema>;
export type ProductMovementQuery = z.infer<typeof ProductMovementQuerySchema>;
export type StockMovementExportQuery = z.infer<typeof StockMovementExportQuerySchema>;
export type ProductMovementExportQuery = z.infer<typeof ProductMovementExportQuerySchema>;
