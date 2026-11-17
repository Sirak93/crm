import type { IStaffLogin } from "./IStaffLogin";

export interface ICompanyStaff {
    uuid: string;
    firstName: string;
    lastName: string;
    position: string | null;
    /** Null for staff who cannot log in (e.g. a Chef). */
    login: IStaffLogin | null;
    createdAt: string;
}
