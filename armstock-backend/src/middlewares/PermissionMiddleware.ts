import { Response, NextFunction } from "express";
import { can, ErrorCodes, type Permission } from "armstock-shared";
import { AuthRequest } from "./AuthMiddleware";
import { AppError } from "../utils/AppError";

/** Must run after AuthMiddleware and the company account check. */
export const PermissionMiddleware = (permission: Permission) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user || !can(req.user.accountType, req.user.permissions, permission)) {
            return next(new AppError(ErrorCodes.AUTH.FORBIDDEN, undefined, undefined, { permission }));
        }
        next();
    };
};
