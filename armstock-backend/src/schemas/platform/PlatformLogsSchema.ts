import { z } from "zod";

/** `z.coerce.boolean()` would turn "false" into `true` (any non-empty string is truthy). */
const BooleanQueryParam = z.enum(["true", "false"]).transform((v) => v === "true").optional();

export const PlatformLogsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    method: z.string().trim().toUpperCase().max(10).optional(),
    path: z.string().trim().max(500).optional(),
    ip: z.string().trim().max(45).optional(),
    slow: BooleanQueryParam,
    success: BooleanQueryParam,
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
});

export type PlatformLogsQuery = z.infer<typeof PlatformLogsQuerySchema>;
