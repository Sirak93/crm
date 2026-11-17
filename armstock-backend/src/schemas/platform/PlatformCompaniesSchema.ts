import { z } from "zod";
import { CompanyStatus } from "armstock-shared";

export const CompanyStatusBodySchema = z.object({
    status: z.enum(CompanyStatus),
});

export const CompanyUserParamsSchema = z.object({
    uuid: z.uuid(),
    userUuid: z.uuid(),
});

export type CompanyStatusBody = z.infer<typeof CompanyStatusBodySchema>;
