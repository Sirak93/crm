import type { AccountType } from "../enums/AccountType";
import type { Permission } from "../enums/Permission";
import type { UserStatus } from "../enums/UserStatus";

/** The logged-in user as the API returns it - never the password or refresh token. */
export interface IAuthUser {
    uuid: string;
    email: string;
    accountType: AccountType;
    /** Empty for owners - they have every permission without storing them. */
    permissions: Permission[];
    status: UserStatus;
    /** Null for the Platform Owner. */
    firstName: string | null;
    lastName: string | null;
    lastLoginAt: string | null;
}
