import type { UserRole } from "../enums/UserRole";
import type { UserStatus } from "../enums/UserStatus";

/** A person in a company: a login user, or STAFF with no access. */
export interface ICompanyUser {
    uuid: string;
    firstName: string;
    lastName: string;
    position: string | null;
    email: string | null;
    role: UserRole;
    status: UserStatus;
    /** False for STAFF - giving a login role then needs a password. */
    hasPassword: boolean;
    lastLoginAt: string | null;
    createdAt: string;
}
