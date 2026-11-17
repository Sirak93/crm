import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { UnitService } from "../../services/UnitService";
import type { UnitBody } from "../../schemas/UnitSchema";
import { AppResponse } from "../../utils/AppResponse";

export class PlatformUnitsController {
    private service = new UnitService();

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(req.body as UnitBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(req.params.uuid as string, req.body as UnitBody));
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
