import { AccountType } from "../enums/AccountType";
import { Permission } from "../enums/Permission";

/** The one permission check used by backend and frontend. The Company Owner has every permission. */
export const can = (accountType: AccountType, permissions: ReadonlySet<Permission>, permission: Permission): boolean =>
    accountType === AccountType.COMPANY_OWNER || permissions.has(permission);
