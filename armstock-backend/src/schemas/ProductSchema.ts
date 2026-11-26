import { z } from "zod";
import { BARCODE_MAX_LENGTH, MEASURE_UNITS, MeasureUnit, ProductStatus } from "armstock-shared";
import { BarcodeQuerySchema, optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";

export const ProductBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    code: optionalText(50),
    barcode: optionalText(BARCODE_MAX_LENGTH),
    categoryUuid: z.uuid(),
});

export const ProductCreateBodySchema = ProductBodySchema.extend({
    // Converter-only units (e.g. mg) can't be a product's unit.
    measureUnit: z.enum(MeasureUnit).refine((unit) => MEASURE_UNITS[unit].isProductUnit),
});

export const ProductStatusBodySchema = z.object({
    status: z.enum(ProductStatus),
});

export const ProductsQuerySchema = PaginatedSearchQuerySchema.extend({
    categoryUuid: z.uuid().optional(),
    status: z.coerce.number().pipe(z.enum(ProductStatus)).optional(),
    barcode: BarcodeQuerySchema,
});

export type ProductBody = z.infer<typeof ProductBodySchema>;
export type ProductCreateBody = z.infer<typeof ProductCreateBodySchema>;
export type ProductStatusBody = z.infer<typeof ProductStatusBodySchema>;
export type ProductsQuery = z.infer<typeof ProductsQuerySchema>;
