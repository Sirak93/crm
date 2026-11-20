import { z } from "zod";
import { PermissionListSchema } from "./SharedSchema";

export const RoleBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    permissions: PermissionListSchema,
    applyToUsers: z.boolean().optional(),
});

export type RoleBody = z.infer<typeof RoleBodySchema>;
