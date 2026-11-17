import type { UserRole } from "../enums/UserRole";
import type { UserStatus } from "../enums/UserStatus";

/** The login (user) linked to a staff member. */
export interface IStaffLogin {
    uuid: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    lastLoginAt: string | null;
}
