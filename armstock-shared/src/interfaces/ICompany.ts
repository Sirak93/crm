import type { CompanyStatus } from "../enums/CompanyStatus";

export interface ICompany {
    uuid: string;
    name: string;
    taxId: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    status: CompanyStatus;
    createdAt: string;
}
