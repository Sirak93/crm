import { z } from "zod";
import { COMPANY_ROLES, UserRole, UserStatus } from "armstock-shared";
import { EmailSchema, optionalText, PasswordSchema } from "../SharedSchema";

const CompanyRoleSchema = z.enum(UserRole).refine((role) => COMPANY_ROLES.includes(role));

export const StaffBodySchema = z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    position: optionalText(100),
});

export const StaffLoginBodySchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
    role: CompanyRoleSchema,
});

export const StaffRoleBodySchema = z.object({
    role: CompanyRoleSchema,
});

export const StaffLoginStatusBodySchema = z.object({
    status: z.enum(UserStatus),
});

export type StaffBody = z.infer<typeof StaffBodySchema>;
export type StaffLoginBody = z.infer<typeof StaffLoginBodySchema>;
export type StaffRoleBody = z.infer<typeof StaffRoleBodySchema>;
export type StaffLoginStatusBody = z.infer<typeof StaffLoginStatusBodySchema>;
