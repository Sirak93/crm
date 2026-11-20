import { AccountType, CompanyStatus, Permission, UserStatus } from "armstock-shared";

/** The per-user auth state AuthMiddleware needs, cached in Redis so a request doesn't hit the DB. */
export interface IAuthSnapshot {
    accountType: AccountType;
    canLogIn: boolean;
    /** An array, as stored in Redis - AuthMiddleware turns it into a Set. */
    permissions: Permission[];
    status: UserStatus;
    companyUuid: string | null;
    /** Null when the user has no company (Platform Owner). */
    companyStatus: CompanyStatus | null;
    /** Epoch ms - tokens issued before this are rejected (logout). */
    revokedBefore?: number;
}
