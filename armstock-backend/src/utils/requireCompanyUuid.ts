import { ErrorCodes } from "armstock-shared";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { AppError } from "./AppError";

/** The logged-in user's company; company routes are closed to users without one. */
export const requireCompanyUuid = (req: AuthRequest): string => {
    const companyUuid = req.user?.companyUUID;
    if (!companyUuid) throw new AppError(ErrorCodes.AUTH.FORBIDDEN, undefined, undefined, { reason: "user has no company" });
    return companyUuid;
};
