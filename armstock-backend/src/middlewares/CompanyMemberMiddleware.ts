import { COMPANY_ACCOUNT_TYPES } from "armstock-shared";
import { AuthMiddleware } from "./AuthMiddleware";
import { AccountTypeMiddleware } from "./AccountTypeMiddleware";

/** Logged in as the Owner or a member of a company - the base of every company route. */
export const CompanyMemberMiddleware = [AuthMiddleware, AccountTypeMiddleware(COMPANY_ACCOUNT_TYPES)];
