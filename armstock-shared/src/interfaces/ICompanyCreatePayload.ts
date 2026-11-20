import type { ICompanyOwnerPayload } from "./ICompanyOwnerPayload";
import type { ICompanyPayload } from "./ICompanyPayload";

/** A new company is always created with its one Owner. */
export interface ICompanyCreatePayload extends ICompanyPayload {
    owner: ICompanyOwnerPayload;
}
