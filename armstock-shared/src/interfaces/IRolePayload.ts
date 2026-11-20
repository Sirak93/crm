import type { Permission } from "../enums/Permission";

export interface IRolePayload {
    name: string;
    permissions: Permission[];
    /** Edit only: also overwrite the permissions of this role's users. */
    applyToUsers?: boolean;
}
