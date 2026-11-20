import { z } from "zod";
import { UserStatus } from "armstock-shared";
import { optionalText, PaginatedSearchQuerySchema, PasswordSchema, PermissionListSchema } from "./SharedSchema";

const CompanyUserBaseSchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    position: optionalText(100),
    canLogIn: z.boolean(),
    // Stored lowercased - login looks it up in that form.
    email: z.string().trim().toLowerCase().max(255).nullish().transform((v) => v || null).pipe(z.email().nullable()),
    password: PasswordSchema.nullish().transform((v) => v ?? null),
});

type CompanyUserBase = z.infer<typeof CompanyUserBaseSchema>;

const requireEmailForLogin = (body: CompanyUserBase, ctx: z.RefinementCtx) => {
    if (body.canLogIn && !body.email) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Email is required for a user who logs in" });
    }
};

export const CompanyUserCreateSchema = CompanyUserBaseSchema.extend({
    roleUuid: z.uuid(),
    // Used only when the person adding may manage permissions; otherwise the role's set is copied.
    permissions: PermissionListSchema.optional(),
}).superRefine((body, ctx) => {
    requireEmailForLogin(body, ctx);
    if (body.canLogIn && !body.password) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required for a user who logs in" });
    }
});

/** The password rule depends on the stored user, so the service checks it. */
export const CompanyUserUpdateSchema = CompanyUserBaseSchema.superRefine(requireEmailForLogin);

export const CompanyUserAccessBodySchema = z.object({
    roleUuid: z.uuid(),
    permissions: PermissionListSchema,
});

export const CompanyUserStatusBodySchema = z.object({
    status: z.enum(UserStatus),
});

export const CompanyUsersQuerySchema = PaginatedSearchQuerySchema.extend({
    status: z.coerce.number().pipe(z.enum(UserStatus)).optional(),
    roleUuid: z.uuid().optional(),
});

export type CompanyUserBody = z.infer<typeof CompanyUserUpdateSchema>;
export type CompanyUserCreateBody = z.infer<typeof CompanyUserCreateSchema>;
export type CompanyUserAccessBody = z.infer<typeof CompanyUserAccessBodySchema>;
export type CompanyUserStatusBody = z.infer<typeof CompanyUserStatusBodySchema>;
export type CompanyUsersQuery = z.infer<typeof CompanyUsersQuerySchema>;
