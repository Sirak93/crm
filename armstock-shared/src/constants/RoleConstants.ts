import { UserRole } from "../enums/UserRole";

/** Every role a company user can have. */
export const COMPANY_ROLES: readonly UserRole[] = [
    UserRole.COMPANY_OWNER,
    UserRole.STOREKEEPER,
    UserRole.ACCOUNTANT,
    UserRole.STAFF,
];

/** Company roles that log in - these need an email and a password. */
export const COMPANY_LOGIN_ROLES: readonly UserRole[] = [
    UserRole.COMPANY_OWNER,
    UserRole.STOREKEEPER,
    UserRole.ACCOUNTANT,
];
