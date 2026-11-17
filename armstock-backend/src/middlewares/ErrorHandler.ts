import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ErrorCodes } from "armstock-shared";
import { AppError } from "../utils/AppError";
import { AppResponse } from "../utils/AppResponse";
import { AppLogger } from "../utils/AppLogger";
import { AppRequestLogger } from "../utils/AppRequestLogger";

export const ErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    AppLogger.error("Error handler => ", err);

    AppRequestLogger.logError(err, req).catch((logErr) => {
        AppLogger.error("Failed to log error to JSON:", logErr);
    });

    if (err instanceof AppError) {
        return AppResponse.error(res, err.code, err.message, err.statusCode);
    }

    if (err instanceof ZodError) {
        return AppResponse.error(
            res,
            ErrorCodes.VALIDATION.GLOBAL.CODE,
            "Invalid request data",
            ErrorCodes.VALIDATION.GLOBAL.STATUS,
        );
    }

    return AppResponse.error(res, ErrorCodes.SERVER.INTERNAL_ERROR.CODE, "Something went wrong", ErrorCodes.SERVER.INTERNAL_ERROR.STATUS);
};
