import { Response, NextFunction } from "express";
import { ErrorCodes, type AccountType } from "armstock-shared";
import { AuthRequest } from "./AuthMiddleware";
import { AppError } from "../utils/AppError";

/** Must run after AuthMiddleware. */
export const AccountTypeMiddleware = (accountTypes: readonly AccountType[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user || !accountTypes.includes(req.user.accountType)) {
            return next(new AppError(ErrorCodes.AUTH.FORBIDDEN));
        }
        next();
    };
};
