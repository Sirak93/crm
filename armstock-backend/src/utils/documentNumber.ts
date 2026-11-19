import { QueryFailedError } from "typeorm";

/** e.g. IN-2026-0015 */
export const formatDocumentNumber = (prefix: string, year: number, number: number): string =>
    `${prefix}-${year}-${String(number).padStart(4, "0")}`;

/** Two saves picked the same number at once - the unique index rejected the second one. */
export const isUniqueViolation = (error: unknown): boolean =>
    error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === "23505";
