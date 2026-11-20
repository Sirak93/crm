import type { Permission } from "../enums/Permission";

/** A member's role and own permission list - set together by someone with MANAGE_USER_PERMISSIONS. */
export interface ICompanyUserAccessPayload {
    roleUuid: string;
    permissions: Permission[];
}
