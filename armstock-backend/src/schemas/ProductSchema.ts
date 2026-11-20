import { z } from "zod";
import { ProductStatus } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";

export const ProductBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    code: optionalText(50),
    categoryUuid: z.uuid(),
});

export const ProductCreateBodySchema = ProductBodySchema.extend({
    measureUnitUuid: z.uuid(),
});

export const ProductStatusBodySchema = z.object({
    status: z.enum(ProductStatus),
});

export const ProductsQuerySchema = PaginatedSearchQuerySchema.extend({
    categoryUuid: z.uuid().optional(),
    status: z.coerce.number().pipe(z.enum(ProductStatus)).optional(),
    // Stock-out picker: active products plus archived ones that still have stock.
    forStockOut: z.stringbool().optional(),
});

export type ProductBody = z.infer<typeof ProductBodySchema>;
export type ProductCreateBody = z.infer<typeof ProductCreateBodySchema>;
export type ProductStatusBody = z.infer<typeof ProductStatusBodySchema>;
export type ProductsQuery = z.infer<typeof ProductsQuerySchema>;
