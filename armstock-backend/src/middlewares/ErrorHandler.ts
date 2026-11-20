import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ErrorCodes } from "armstock-shared";
import { AppError } from "../utils/AppError";
import { AppResponse } from "../utils/AppResponse";
import { AppLogger } from "../utils/AppLogger";

export const ErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    AppLogger.error("Error handler => ", err);

    // Read by ApiLogger when the response finishes, so the api_logs row records what broke.
    res.locals.error = err;

    if (err instanceof AppError) {
        return AppResponse.error(res, err.code, err.message, err.statusCode, err.data);
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
