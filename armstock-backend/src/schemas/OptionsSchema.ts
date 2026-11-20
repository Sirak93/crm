import { z } from "zod";
import { BarcodeQuerySchema } from "./SharedSchema";

const search = z.string().trim().max(255).optional();

export const ProductOptionsQuerySchema = z.object({
    search,
    // Stock-out picker: active products plus archived ones that still have stock.
    forStockOut: z.stringbool().optional(),
    // Return picker: only products that came in from this supplier.
    suppliedBy: z.uuid().optional(),
    barcode: BarcodeQuerySchema,
});

export const SupplierOptionsQuerySchema = z.object({
    search,
    // New documents pick active suppliers only; filters pick any.
    activeOnly: z.stringbool().optional(),
});

export type ProductOptionsQuery = z.infer<typeof ProductOptionsQuerySchema>;
export type SupplierOptionsQuery = z.infer<typeof SupplierOptionsQuerySchema>;
