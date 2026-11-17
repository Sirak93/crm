import { z } from "zod";

/** Trimmed; an empty value is stored as null. */
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

export const PlatformCompaniesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().max(255).optional(),
});

export const CompanyParamsSchema = z.object({
    uuid: z.uuid(),
});

export const CompanyBodySchema = z.object({
    name: z.string().trim().min(1).max(255),
    taxId: optionalText(50),
    phone: optionalText(50),
    email: optionalText(255).pipe(z.email().nullable()),
    address: optionalText(500),
});

export const CompanyActiveBodySchema = z.object({
    isActive: z.boolean(),
});

export type PlatformCompaniesQuery = z.infer<typeof PlatformCompaniesQuerySchema>;
export type CompanyBody = z.infer<typeof CompanyBodySchema>;
export type CompanyActiveBody = z.infer<typeof CompanyActiveBodySchema>;
