import { AccountType } from "../enums/AccountType";
import type { Permission } from "../enums/Permission";
import { OWNER_ONLY_PERMISSIONS } from "../constants/PermissionConstants";

/** Permissions this account type may not turn on or off - the owner-only ones for a company member. */
export const lockedPermissions = (accountType: AccountType): readonly Permission[] =>
    accountType === AccountType.COMPANY_MEMBER ? OWNER_ONLY_PERMISSIONS : [];

/** `next`, with each locked permission kept as it is in `current`. */
export const keepLocked = (next: readonly Permission[], current: readonly Permission[], locked: readonly Permission[]): Permission[] => [
    ...next.filter((p) => !locked.includes(p)),
    ...current.filter((p) => locked.includes(p)),
];
