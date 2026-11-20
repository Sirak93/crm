import type { AccountType } from "../enums/AccountType";
import type { Permission } from "../enums/Permission";
import type { UserStatus } from "../enums/UserStatus";
import type { INamedRef } from "./INamedRef";

/** A person in a company: the Owner, or a member with a company role. */
export interface ICompanyUser {
    uuid: string;
    firstName: string;
    lastName: string;
    position: string | null;
    email: string | null;
    accountType: AccountType;
    /** Null for the Owner. */
    role: INamedRef | null;
    canLogIn: boolean;
    permissions: Permission[];
    status: UserStatus;
    /** False for a user without login - turning login on then needs a password. */
    hasPassword: boolean;
    lastLoginAt: string | null;
    createdAt: string;
}
