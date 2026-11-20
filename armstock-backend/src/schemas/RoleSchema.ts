import { z } from "zod";
import { Permission } from "armstock-shared";

export const RoleBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    // Deduplicated - each permission is stored once.
    permissions: z.array(z.enum(Permission)).max(Object.keys(Permission).length).transform((list) => [...new Set(list)]),
    applyToUsers: z.boolean().optional(),
});

export type RoleBody = z.infer<typeof RoleBodySchema>;
