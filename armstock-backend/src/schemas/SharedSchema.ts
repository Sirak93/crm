import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "armstock-shared";

/** Trimmed; an empty value is stored as null. */
export const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

export const PaginatedSearchQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().max(255).optional(),
});

export const UuidParamsSchema = z.object({
    uuid: z.uuid(),
});

/** Stored lowercased - login looks it up in that form. */
export const EmailSchema = z.string().trim().toLowerCase().max(255).pipe(z.email());

// bcrypt reads only the first 72 bytes.
export const PasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(72);

export type PaginatedSearchQuery = z.infer<typeof PaginatedSearchQuerySchema>;
