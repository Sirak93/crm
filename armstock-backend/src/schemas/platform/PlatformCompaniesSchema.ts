import { z } from "zod";
import { CompanyStatus } from "armstock-shared";
import { EmailSchema, PasswordSchema } from "../SharedSchema";
import { StaffBodySchema } from "../company/CompanyStaffSchema";

export const CompanyStatusBodySchema = z.object({
    status: z.enum(CompanyStatus),
});

export const CompanyOwnerBodySchema = StaffBodySchema.extend({
    email: EmailSchema,
    password: PasswordSchema,
});

export type CompanyStatusBody = z.infer<typeof CompanyStatusBodySchema>;
export type CompanyOwnerBody = z.infer<typeof CompanyOwnerBodySchema>;
