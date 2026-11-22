import { QUANTITY_DECIMALS } from "armstock-shared";
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
