import { z } from "zod";
import { EmailSchema, optionalText, PasswordSchema } from "./SharedSchema";

export const CompanyBodySchema = z.object({
    name: z.string().trim().min(1).max(255),
    taxId: optionalText(50),
    phone: optionalText(50),
    email: optionalText(255).pipe(z.email().nullable()),
    address: optionalText(500),
});

/** A new company is always created with its one Owner. */
export const CompanyCreateBodySchema = CompanyBodySchema.extend({
    owner: z.object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: EmailSchema,
        password: PasswordSchema,
    }),
});

export type CompanyBody = z.infer<typeof CompanyBodySchema>;
export type CompanyCreateBody = z.infer<typeof CompanyCreateBodySchema>;
