import { Response, NextFunction } from "express";
import { ErrorCodes, UserRole } from "armstock-shared";
import { AuthRequest } from "./AuthMiddleware";
import { AppError } from "../utils/AppError";

/** Must run after AuthMiddleware. */
export const RoleMiddleware = (roles: UserRole[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(ErrorCodes.AUTH.FORBIDDEN));
        }
        next();
    };
};
