import path from "path";
import { Request, Response } from "express";
import { FileWorker } from "./FileWorker";
import { AppLogger } from "./AppLogger";
import { redactSecrets } from "./redactSecrets";

/** Writes requests, responses, and errors to daily JSONL files (when ENABLE_REQUEST_LOGGING=true). */
export class AppRequestLogger {
    private static LOG_DIR = path.join(process.cwd(), "logs");

    private static get isEnabled(): boolean {
        return process.env.ENABLE_REQUEST_LOGGING === "true";
    }

    private static getLogFilePath(): string {
        const dateStr = new Date().toISOString().split("T")[0];
        return path.join(this.LOG_DIR, `app-${dateStr}.log.json`);
    }

    static async logRequest(req: Request): Promise<void> {
        if (!this.isEnabled) return;

        await this.writeLog({
            timestamp: new Date().toISOString(),
            type: "request",
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            headers: {
                "user-agent": req.headers["user-agent"],
                "content-type": req.headers["content-type"],
            },
            query: req.query,
            body: req.method !== "GET" ? redactSecrets(req.body) : undefined,
        });
    }

    static async logResponse(req: Request, res: Response, body?: unknown): Promise<void> {
        if (!this.isEnabled) return;

        await this.writeLog({
            timestamp: new Date().toISOString(),
            type: "response",
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            ip: req.ip,
            body: redactSecrets(body),
        });
    }

    static async logError(error: any, req?: Request): Promise<void> {
        if (!this.isEnabled) return;

        await this.writeLog({
            timestamp: new Date().toISOString(),
            type: "error",
            method: req?.method,
            url: req?.originalUrl,
            ip: req?.ip,
            message: error.message || "Unknown error",
            code: error.code,
            stack: error.stack,
            details: redactSecrets(error.details),
        });
    }

    private static async writeLog(entry: unknown): Promise<void> {
        try {
            await FileWorker.ensureDirectory(this.LOG_DIR);
            await FileWorker.append(this.getLogFilePath(), JSON.stringify(entry));
        } catch (error) {
            AppLogger.error("Failed to write log entry:", error);
        }
    }
}
