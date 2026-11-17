import type { ICompanyStaffPayload } from "./ICompanyStaffPayload";

/** Body for the Platform Owner adding a company's owner: staff record + login together. */
export interface ICompanyOwnerPayload extends ICompanyStaffPayload {
    email: string;
    password: string;
}
