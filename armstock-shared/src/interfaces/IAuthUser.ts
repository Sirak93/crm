import type { UserRole } from "../enums/UserRole";
import type { UserStatus } from "../enums/UserStatus";

/** The logged-in user as the API returns it - never the password or refresh token. */
export interface IAuthUser {
    uuid: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    lastLoginAt: string | null;
}
