import { UserRole } from "armstock-shared";

export interface ICreateLogin {
    email: string;
    password: string;
    role: UserRole;
    companyUuid: string;
    staffUuid: string;
}
