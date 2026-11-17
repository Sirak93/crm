import type { UserRole } from "../enums/UserRole";

/** The logged-in user as the API returns it - never the password or refresh token. */
export interface IAuthUser {
    uuid: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt: string | null;
}
