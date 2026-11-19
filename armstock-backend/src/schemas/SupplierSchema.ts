import { z } from "zod";
import { SupplierStatus } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema } from "./SharedSchema";

const SupplierContactSchema = z.object({
    name: z.string().trim().min(1).max(200),
    position: optionalText(100),
    phone: optionalText(50),
});

export const SupplierBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
    taxId: optionalText(50),
    note: optionalText(1000),
    contacts: z.array(SupplierContactSchema).max(20),
});

export const SupplierStatusBodySchema = z.object({
    status: z.enum(SupplierStatus),
});

export const SuppliersQuerySchema = PaginatedSearchQuerySchema.extend({
    status: z.coerce.number().pipe(z.enum(SupplierStatus)).optional(),
});

export type SupplierBody = z.infer<typeof SupplierBodySchema>;
export type SupplierStatusBody = z.infer<typeof SupplierStatusBodySchema>;
export type SuppliersQuery = z.infer<typeof SuppliersQuerySchema>;
