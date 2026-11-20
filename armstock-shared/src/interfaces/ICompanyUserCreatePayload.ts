import type { Permission } from "../enums/Permission";
import type { ICompanyUserPayload } from "./ICompanyUserPayload";

/** A new user is always a member with a company role. Without `permissions` the role's set is copied in. */
export interface ICompanyUserCreatePayload extends ICompanyUserPayload {
    roleUuid: string;
    permissions?: Permission[];
}
