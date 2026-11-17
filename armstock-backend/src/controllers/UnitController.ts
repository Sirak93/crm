import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { UnitService } from "../services/UnitService";
import type { UnitBody } from "../schemas/UnitSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company units. */
export class UnitController {
    private service = new UnitService();

    list = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.list(requireCompanyUuid(req)));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as UnitBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as UnitBody));
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
