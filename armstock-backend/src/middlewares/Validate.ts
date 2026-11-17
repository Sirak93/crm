import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { ErrorCodes } from "armstock-shared";
import { AppResponse } from "../utils/AppResponse";
import { AppLogger } from "../utils/AppLogger";

export type ValidationSource = "body" | "query" | "params";

export const validate =
    (schema: ZodType, source: ValidationSource = "body") =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req[source]);

            if (!result.success) {
                AppLogger.error(`Validation error in ${source}:`, result.error.issues);
                return AppResponse.error(
                    res,
                    ErrorCodes.VALIDATION.GLOBAL.CODE,
                    "Invalid request data",
                    ErrorCodes.VALIDATION.GLOBAL.STATUS,
                    { validation: result.error.issues },
                );
            }

            if (source === "body") {
                req.body = result.data;
            } else if (source === "query") {
                // Express 5's req.query is a getter that re-parses the URL on every access,
                // so redefining it is the only way coerced values stick.
                Object.defineProperty(req, "query", {
                    value: result.data,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
            } else {
                const target = req.params as Record<string, unknown>;
                Object.keys(target).forEach((key) => delete target[key]);
                Object.assign(target, result.data);
            }

            next();
        };
