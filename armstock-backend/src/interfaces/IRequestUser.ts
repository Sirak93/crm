import { AuthUserJwtPayload } from "../utils/JWT";

/** `req.user` after AuthMiddleware: the token's claims with the current role and company. */
export interface IRequestUser extends AuthUserJwtPayload {
    companyUUID: string | null;
}
