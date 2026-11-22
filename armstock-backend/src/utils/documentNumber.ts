import { type EntityManager, type EntityTarget, type ObjectLiteral } from "typeorm";
import { AppDataSource } from "../config/database";

/** e.g. IN-2026-0015 */
export const formatDocumentNumber = (prefix: string, year: number, number: number): string =>
    `${prefix}-${year}-${String(number).padStart(4, "0")}`;

/**
 * Runs `save` in a transaction with the next number: the company's biggest this year + 1.
 * Returns what `save` returns (the new document's uuid).
 */
export const saveNumberedDocument = async (
    entity: EntityTarget<ObjectLiteral>,
    companyUuid: string,
    save: (manager: EntityManager, year: number, number: number) => Promise<string>,
): Promise<string> => {
    const table = AppDataSource.getMetadata(entity).tableName;

    return AppDataSource.transaction(async (manager) => {
        // Per company and document type, held until commit: parallel saves take numbers one
        // after another instead of clashing. Taken before any product lock, so no deadlock.
        await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${table}:${companyUuid}`]);

        const year = new Date().getFullYear();
        const { max } = await manager.createQueryBuilder(entity, "doc")
            .select("MAX(doc.number)", "max")
            .where("doc.companyUuid = :companyUuid AND doc.year = :year", { companyUuid, year })
            .getRawOne<{ max: number | null }>() ?? { max: null };
        return save(manager, year, (max ?? 0) + 1);
    });
};
