/** Company form fields as typed; empty strings become null in the payload. */
export interface ICompanyForm {
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
}
