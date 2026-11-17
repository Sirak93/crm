import { z } from "zod";
import { optionalText } from "./SharedSchema";

export const CompanyBodySchema = z.object({
    name: z.string().trim().min(1).max(255),
    taxId: optionalText(50),
    phone: optionalText(50),
    email: optionalText(255).pipe(z.email().nullable()),
    address: optionalText(500),
});

export type CompanyBody = z.infer<typeof CompanyBodySchema>;
