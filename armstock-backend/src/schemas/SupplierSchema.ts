import { z } from "zod";
import { SupplierStatus } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema, UuidParamsSchema } from "./SharedSchema";

export const SupplierBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    taxId: optionalText(50),
    note: optionalText(1000),
});

export const SupplierStatusBodySchema = z.object({
    status: z.enum(SupplierStatus),
});

export const SuppliersQuerySchema = PaginatedSearchQuerySchema.extend({
    status: z.coerce.number().pipe(z.enum(SupplierStatus)).optional(),
});

export const SupplierContactBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    position: optionalText(100),
    phone: optionalText(50),
    note: optionalText(500),
});

export const SupplierContactParamsSchema = UuidParamsSchema.extend({
    contactUuid: z.uuid(),
});

export type SupplierBody = z.infer<typeof SupplierBodySchema>;
export type SupplierStatusBody = z.infer<typeof SupplierStatusBodySchema>;
export type SuppliersQuery = z.infer<typeof SuppliersQuerySchema>;
export type SupplierContactBody = z.infer<typeof SupplierContactBodySchema>;
