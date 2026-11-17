import { z } from "zod";

export const UnitBodySchema = z.object({
    name: z.string().trim().min(1).max(50),
    shortName: z.string().trim().min(1).max(10),
    allowsDecimals: z.boolean(),
});

export type UnitBody = z.infer<typeof UnitBodySchema>;
