/**
 * Edit body for a company user's basic data. With login an email is required, and a password
 * unless the user already has one; `password: null` keeps the current one.
 */
export interface ICompanyUserPayload {
    firstName: string;
    lastName: string;
    position: string | null;
    canLogIn: boolean;
    email: string | null;
    password: string | null;
}
