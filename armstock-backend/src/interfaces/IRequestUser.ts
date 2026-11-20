import type { AccountType, Permission } from "armstock-shared";

/** `req.user` after AuthMiddleware: the current access rights from the auth snapshot. */
export interface IRequestUser {
    userUUID: string;
    companyUUID: string | null;
    accountType: AccountType;
    permissions: ReadonlySet<Permission>;
}
