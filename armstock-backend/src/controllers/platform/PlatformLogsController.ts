import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { PlatformLogsService } from "../../services/platform/PlatformLogsService";
import type { PlatformLogsQuery } from "../../schemas/platform/PlatformLogsSchema";
import { AppResponse } from "../../utils/AppResponse";

export class PlatformLogsController {
    private service = new PlatformLogsService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(req.query as unknown as PlatformLogsQuery);
        return AppResponse.send(res, items, meta);
    };

    clear = async (_req: AuthRequest, res: Response) => {
        await this.service.clear();
        return AppResponse.send(res, { success: true });
    };
}
