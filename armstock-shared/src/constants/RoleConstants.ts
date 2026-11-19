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

/** Roles that manage the company catalog (units, categories, products). Accountant only views. */
export const CATALOG_MANAGER_ROLES: readonly UserRole[] = [
    UserRole.COMPANY_OWNER,
    UserRole.STOREKEEPER,
];

/** Roles that create stock documents. Accountant only views. */
export const STOCK_MANAGER_ROLES: readonly UserRole[] = [
    UserRole.COMPANY_OWNER,
    UserRole.STOREKEEPER,
];
