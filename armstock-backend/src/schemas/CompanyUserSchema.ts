import { z } from "zod";
import { COMPANY_LOGIN_ROLES, COMPANY_ROLES, UserRole, UserStatus } from "armstock-shared";
import { optionalText, PasswordSchema } from "./SharedSchema";

const CompanyUserBaseSchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    position: optionalText(100),
    role: z.enum(UserRole).refine((role) => COMPANY_ROLES.includes(role)),
    // Stored lowercased - login looks it up in that form.
    email: z.string().trim().toLowerCase().max(255).nullish().transform((v) => v || null).pipe(z.email().nullable()),
    password: PasswordSchema.nullish().transform((v) => v ?? null),
});

type CompanyUserBase = z.infer<typeof CompanyUserBaseSchema>;

const requireEmailForLoginRole = (body: CompanyUserBase, ctx: z.RefinementCtx) => {
    if (COMPANY_LOGIN_ROLES.includes(body.role) && !body.email) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Email is required for a role that logs in" });
    }
};

export const CompanyUserCreateSchema = CompanyUserBaseSchema.superRefine((body, ctx) => {
    requireEmailForLoginRole(body, ctx);
    if (COMPANY_LOGIN_ROLES.includes(body.role) && !body.password) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required for a role that logs in" });
    }
});

/** The password rule depends on the stored user, so the service checks it. */
export const CompanyUserUpdateSchema = CompanyUserBaseSchema.superRefine(requireEmailForLoginRole);

export const CompanyUserStatusBodySchema = z.object({
    status: z.enum(UserStatus),
});

export type CompanyUserBody = z.infer<typeof CompanyUserBaseSchema>;
export type CompanyUserStatusBody = z.infer<typeof CompanyUserStatusBodySchema>;
