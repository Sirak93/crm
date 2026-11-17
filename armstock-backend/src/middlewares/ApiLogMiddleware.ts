import { Request, Response, NextFunction } from "express";
import { ApiLogger } from "../utils/ApiLogger";

/**
 * Times every request end-to-end and logs it via ApiLogger once it finishes.
 * Mounted before the routers, so `req.user` (set later by auth) is already there
 * when the `finish` callback reads it.
 */
export const ApiLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        ApiLogger.log(req, res, durationMs).catch(() => {});
    });

    next();
};
