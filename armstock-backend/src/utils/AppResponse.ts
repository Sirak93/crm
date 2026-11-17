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
