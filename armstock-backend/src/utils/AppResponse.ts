import { Response } from "express";
import type { IAppErrorResponse, IAppResponse } from "armstock-shared";

export class AppResponse {
    static send<T>(res: Response, data: T, meta?: unknown) {
        const response: IAppResponse<T> = {
            success: true,
            data,
            meta,
        };
        return res.status(200).json(response);
    }

    /** A download; `filename*` keeps non-Latin names (Armenian product names). */
    static file(res: Response, fileName: string, contentType: string, content: Buffer) {
        const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        return res.status(200).send(content);
    }

    static error(res: Response, code: string, message: string, status = 400, meta?: unknown) {
        const response: IAppErrorResponse = {
            success: false,
            error: {
                code,
                message,
                meta,
            },
        };
        return res.status(status).json(response);
    }
}
