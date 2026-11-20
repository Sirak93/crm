import { QueryFailedError, type EntityManager, type EntityTarget, type ObjectLiteral } from "typeorm";
import { AppDataSource } from "../config/database";

const NUMBER_ATTEMPTS = 3;

/** e.g. IN-2026-0015 */
export const formatDocumentNumber = (prefix: string, year: number, number: number): string =>
    `${prefix}-${year}-${String(number).padStart(4, "0")}`;

/** Two saves picked the same number at once - the unique index rejected the second one. */
export const isUniqueViolation = (error: unknown): boolean =>
    error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === "23505";

/**
 * Runs `save` in a transaction with the next number: the company's biggest this year + 1.
 * A clash with a parallel save retries. Returns what `save` returns (the new document's uuid).
 */
export const saveNumberedDocument = async (
    entity: EntityTarget<ObjectLiteral>,
    companyUuid: string,
    save: (manager: EntityManager, year: number, number: number) => Promise<string>,
): Promise<string> => {
    for (let attempt = 1; ; attempt++) {
        try {
            return await AppDataSource.transaction(async (manager) => {
                const year = new Date().getFullYear();
                const { max } = await manager.createQueryBuilder(entity, "doc")
                    .select("MAX(doc.number)", "max")
                    .where("doc.companyUuid = :companyUuid AND doc.year = :year", { companyUuid, year })
                    .getRawOne<{ max: number | null }>() ?? { max: null };
                return save(manager, year, (max ?? 0) + 1);
            });
        } catch (error) {
            if (attempt < NUMBER_ATTEMPTS && isUniqueViolation(error)) continue;
            throw error;
        }
    }
};
