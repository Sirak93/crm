import { QueryFailedError } from "typeorm";
import { AppError, type ErrorDef } from "./AppError";

const UNIQUE_VIOLATION = "23505";

/**
 * For `.catch()` on a save: a unique key listed in `errors` becomes that client error.
 * Services check first for a clear message; this covers two saves at the same moment.
 */
export const onUniqueViolation = (errors: Record<string, ErrorDef>) => (error: unknown): never => {
    if (error instanceof QueryFailedError) {
        const { code, constraint } = error.driverError as { code?: string; constraint?: string };
        const mapped = code === UNIQUE_VIOLATION && constraint ? errors[constraint] : undefined;
        if (mapped) throw new AppError(mapped, undefined, undefined, { constraint });
    }
    throw error;
};
