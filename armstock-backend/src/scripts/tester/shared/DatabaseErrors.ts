import { equals, isTrue } from "../core/Assert";
import type { TestDatabase } from "../core/TestDatabase";

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

/** Runs `sql` straight on the database and expects Postgres to refuse it with `code`. */
export const expectRefused = async (db: TestDatabase, sql: string, params: unknown[], code: string, label: string): Promise<void> => {
    try {
        await db.query(sql, params);
    } catch (error) {
        const found = error as { code?: string; driverError?: { code?: string } };
        equals(found.code ?? found.driverError?.code, code, label);
        return;
    }
    isTrue(false, `${label}: expected the database to refuse it`);
};
