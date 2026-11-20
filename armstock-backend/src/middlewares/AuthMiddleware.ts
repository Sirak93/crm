import { Request, Response, NextFunction } from "express";
import { CompanyStatus, ErrorCodes, UserStatus } from "armstock-shared";
import { tokenFailureDetails, verifyToken } from "../utils/JWT";
import { AppError } from "../utils/AppError";
import { AuthCacheService } from "../services/AuthCacheService";
import { IRequestUser } from "../interfaces/IRequestUser";

export interface AuthRequest extends Request {
    user?: IRequestUser;
}

export const AuthMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "no auth header" });
        }

        let decoded: ReturnType<typeof verifyToken>;
        try {
            decoded = verifyToken(token);
        } catch (error) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, tokenFailureDetails(token, error));
        }

        const tokenUser = { userUuid: decoded.userUUID };
        const snapshot = await AuthCacheService.getSnapshot(decoded.userUUID);

        if (!snapshot) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "user not found", ...tokenUser });
        }

        if (snapshot.revokedBefore && (decoded.iat ?? 0) * 1000 < snapshot.revokedBefore) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "token issued before logout", ...tokenUser });
        }

        // A user whose login was turned off keeps an unexpired token for a while - it must not work.
        if (!snapshot.canLogIn) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "login turned off", ...tokenUser });
        }

        if (snapshot.status !== UserStatus.ACTIVE) {
            throw new AppError(ErrorCodes.USER.BLOCKED);
        }

        if (snapshot.companyStatus !== null && snapshot.companyStatus !== CompanyStatus.ACTIVE) {
            throw new AppError(ErrorCodes.COMPANY.BLOCKED);
        }

        // Rights from the snapshot, not the token: a change applies to open sessions on their next request.
        req.user = {
            userUUID: decoded.userUUID,
            companyUUID: snapshot.companyUuid,
            accountType: snapshot.accountType,
            permissions: new Set(snapshot.permissions),
        };
        next();
    } catch (err) {
        next(err);
    }
};
