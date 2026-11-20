import type { ICompanyUserPayload } from "./ICompanyUserPayload";

/** A new user is always a member with a company role; its permissions are copied in. */
export interface ICompanyUserCreatePayload extends ICompanyUserPayload {
    roleUuid: string;
}
