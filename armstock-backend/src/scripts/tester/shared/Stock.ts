import { QUANTITY_DECIMALS, RECIPE_QUANTITY_DECIMALS, StockOutDepartment } from "armstock-shared";
import { equals } from "../core/Assert";
import type { TestDatabase } from "../core/TestDatabase";

const QUANTITY_SCALE = 10 ** QUANTITY_DECIMALS;

/** A product's stock, summed straight from the document lines in the database. */
export const stockOf = async (db: TestDatabase, productUuid: string): Promise<number> => {
    const [row] = await db.query<{ quantity: string }>(
        `SELECT
            COALESCE((SELECT SUM(quantity) FROM stock_in_lines WHERE product_uuid = $1), 0)
          - COALESCE((SELECT SUM(quantity) FROM stock_out_lines WHERE product_uuid = $1), 0) AS quantity`,
        [productUuid],
    );
    return Math.round(Number(row.quantity) * QUANTITY_SCALE) / QUANTITY_SCALE;
};

export const expectStock = async (db: TestDatabase, productUuid: string, expected: number, label = "stock"): Promise<void> => {
    equals(await stockOf(db, productUuid), expected, label);
};

/** A product's kitchen balance (K), summed straight from the database: totals issued to the kitchen − recipe needs. */
export const kitchenOf = async (db: TestDatabase, productUuid: string): Promise<number> => {
    const [row] = await db.query<{ quantity: string }>(
        `SELECT
            COALESCE((SELECT SUM(quantity) FROM stock_out_lines WHERE product_uuid = $1 AND department = $2), 0)
          - COALESCE((SELECT SUM(needed_quantity) FROM stock_out_recipe_lines WHERE product_uuid = $1), 0) AS quantity`,
        [productUuid, StockOutDepartment.KITCHEN],
    );
    return Number(Number(row.quantity).toFixed(RECIPE_QUANTITY_DECIMALS));
};

export const expectKitchen = async (db: TestDatabase, productUuid: string, expected: number, label = "kitchen balance"): Promise<void> => {
    equals(await kitchenOf(db, productUuid), expected, label);
};
