import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { PlatformDatabaseService } from "../../services/platform/PlatformDatabaseService";
import { AppResponse } from "../../utils/AppResponse";

export class PlatformDatabaseController {
    private service = new PlatformDatabaseService();

    getStorage = async (_req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.getStorage());
    };
}
