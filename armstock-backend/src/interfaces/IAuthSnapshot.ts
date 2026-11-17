import { CompanyStatus, UserRole, UserStatus } from "armstock-shared";

/** The per-user auth state AuthMiddleware needs, cached in Redis so a request doesn't hit the DB. */
export interface IAuthSnapshot {
    role: UserRole;
    status: UserStatus;
    companyUuid: string | null;
    /** Null when the user has no company (Platform Owner). */
    companyStatus: CompanyStatus | null;
    /** Epoch ms - tokens issued before this are rejected (logout). */
    revokedBefore?: number;
}
