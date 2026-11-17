/** Create/edit body for a company. Empty optional fields are sent as null. */
export interface ICompanyPayload {
    name: string;
    taxId: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
}
