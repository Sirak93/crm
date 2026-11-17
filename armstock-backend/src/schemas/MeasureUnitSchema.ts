import { z } from "zod";

export const MeasureUnitBodySchema = z.object({
    name: z.string().trim().min(1).max(50),
    shortName: z.string().trim().min(1).max(10),
    allowsDecimals: z.boolean(),
});

export type MeasureUnitBody = z.infer<typeof MeasureUnitBodySchema>;
