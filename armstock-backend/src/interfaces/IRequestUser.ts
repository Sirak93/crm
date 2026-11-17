import { AuthUserJwtPayload } from "../utils/JWT";

/** `req.user` after AuthMiddleware: the token's claims with the current role. */
export interface IRequestUser extends AuthUserJwtPayload {}
