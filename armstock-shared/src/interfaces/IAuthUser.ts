import type { UserRole } from "../enums/UserRole";
import type { UserStatus } from "../enums/UserStatus";

/** The logged-in user as the API returns it - never the password or refresh token. */
export interface IAuthUser {
    uuid: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    /** From the linked staff record; null for the Platform Owner. */
    firstName: string | null;
    lastName: string | null;
    lastLoginAt: string | null;
}
