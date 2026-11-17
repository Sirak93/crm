import { UserRole } from "../enums/UserRole";

/** Roles of company users - the ones a Company Owner can give. */
export const COMPANY_ROLES: readonly UserRole[] = [
    UserRole.COMPANY_OWNER,
    UserRole.STOREKEEPER,
    UserRole.ACCOUNTANT,
];
