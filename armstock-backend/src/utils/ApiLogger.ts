import { Request, Response } from "express";
import { API_PATH } from "armstock-shared";
import { AppLogger } from "./AppLogger";
import { AppDataSource } from "../config/database";
import { ApiLog } from "../models/ApiLog";
import { redactSecrets } from "./redactSecrets";
import { AuthRequest } from "../middlewares/AuthMiddleware";

/** `ErrorHandler` stashes the caught error on `res.locals.error` before responding. */
function extractError(res: Response): { message: string; code?: string; details?: unknown } | undefined {
    const error = res.locals.error;
    if (!error) return undefined;
    return {
        message: error instanceof Error ? error.message : String(error),
        code: typeof error?.code === "string" ? error.code : undefined,
        details: redactSecrets(error?.details),
    };
}

/**
 * Writes one `api_logs` row per API request: who, what, how long, and - for failed
 * requests - the redacted query, body, and error, so it can be reproduced later.
 * The auth token is never logged.
 */
export class ApiLogger {
    private static get isEnabled(): boolean {
        return process.env.API_DB_LOG_ENABLED === "true";
    }

    static async log(req: Request, res: Response, durationMs: number): Promise<void> {
        if (!this.isEnabled) return;

        const requestPath = req.originalUrl.split("?")[0]!;
        // Browsing the logs must not add rows to what is being browsed (page totals would shift).
        if (requestPath.startsWith(`${API_PATH}/platform/logs`)) return;

        const method = req.method;
        const statusCode = res.statusCode;
        const success = statusCode < 400;

        try {
            await AppDataSource.getRepository(ApiLog).insert({
                method,
                path: requestPath,
                statusCode,
                durationMs: Math.round(durationMs),
                slow: durationMs >= Number(process.env.SLOW_REQUEST_THRESHOLD_MS),
                success,
                userUuid: (req as AuthRequest).user?.userUUID ?? null,
                companyUuid: (req as AuthRequest).user?.companyUUID ?? null,
                ip: req.ip ?? null,
                payload: success ? undefined : {
                    query: req.query,
                    body: method !== "GET" ? redactSecrets(req.body) : undefined,
                    error: extractError(res),
                },
            });
        } catch (error) {
            AppLogger.error("Failed to write API log row:", error);
        }
    }
}
