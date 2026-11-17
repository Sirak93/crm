import { Request, Response, NextFunction } from "express";
import { CompanyStatus, ErrorCodes, UserRole, UserStatus } from "armstock-shared";
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

        const tokenUser = { userUuid: decoded.userUUID, role: UserRole[decoded.role] };
        const snapshot = await AuthCacheService.getSnapshot(decoded.userUUID);

        if (!snapshot) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "user not found", ...tokenUser });
        }

        if (snapshot.revokedBefore && (decoded.iat ?? 0) * 1000 < snapshot.revokedBefore) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "token issued before logout", ...tokenUser });
        }

        // A user switched to STAFF keeps an unexpired token for a while - it must not work.
        if (snapshot.role === UserRole.STAFF) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "STAFF cannot log in", ...tokenUser });
        }

        if (snapshot.status !== UserStatus.ACTIVE) {
            throw new AppError(ErrorCodes.USER.BLOCKED);
        }

        if (snapshot.companyStatus !== null && snapshot.companyStatus !== CompanyStatus.ACTIVE) {
            throw new AppError(ErrorCodes.COMPANY.BLOCKED);
        }

        // Role from the snapshot, not the token: a role change applies to open sessions at once.
        req.user = { userUUID: decoded.userUUID, role: snapshot.role, companyUUID: snapshot.companyUuid };
        next();
    } catch (err) {
        next(err);
    }
};
