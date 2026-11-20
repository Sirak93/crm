import type { Permission } from "../enums/Permission";

/** A company role - a name plus the starting permissions copied to its users. */
export interface IRole {
    uuid: string;
    name: string;
    permissions: Permission[];
    /** Users with this role - active, blocked, and archived. */
    userCount: number;
}
