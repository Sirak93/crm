import { z } from "zod";

export const ProductCategoryBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
});

export type ProductCategoryBody = z.infer<typeof ProductCategoryBodySchema>;
