import { Request, Response, NextFunction } from "express";
import { AppRequestLogger } from "../utils/AppRequestLogger";
import { AppLogger } from "../utils/AppLogger";

/** Logs every incoming request and its response. */
export const RequestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    AppRequestLogger.logRequest(req).catch((err) => {
        AppLogger.error("Error logging request:", err);
    });

    // Wrap send to capture the response body.
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any): Response {
        responseBody = body;
        return originalSend.call(this, body);
    };

    res.on("finish", () => {
        let parsedBody = responseBody;

        if (typeof responseBody === "string") {
            try {
                parsedBody = JSON.parse(responseBody);
            } catch {
                // Not JSON, keep as is
            }
        }

        AppRequestLogger.logResponse(req, res, parsedBody).catch((err) => {
            AppLogger.error("Error logging response:", err);
        });
    });

    next();
};
