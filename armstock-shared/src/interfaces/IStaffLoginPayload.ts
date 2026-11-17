import type { UserRole } from "../enums/UserRole";

/** Body for giving a staff member a login. */
export interface IStaffLoginPayload {
    email: string;
    password: string;
    role: UserRole;
}
