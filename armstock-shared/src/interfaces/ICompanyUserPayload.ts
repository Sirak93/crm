import type { UserRole } from "../enums/UserRole";

/**
 * Create/edit body for a company user. A login role needs an email, and a password unless
 * the user already has one; `password: null` keeps the current one.
 */
export interface ICompanyUserPayload {
    firstName: string;
    lastName: string;
    position: string | null;
    role: UserRole;
    email: string | null;
    password: string | null;
}
