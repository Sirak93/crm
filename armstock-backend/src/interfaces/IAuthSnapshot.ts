import { UserRole } from "armstock-shared";

/** The per-user auth state AuthMiddleware needs, cached in Redis so a request doesn't hit the DB. */
export interface IAuthSnapshot {
    role: UserRole;
    isActive: boolean;
    /** Epoch ms - tokens issued before this are rejected (logout). */
    revokedBefore?: number;
}
