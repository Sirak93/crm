import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { MeasureUnitService } from "../services/MeasureUnitService";
import type { MeasureUnitBody } from "../schemas/MeasureUnitSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company units. */
export class MeasureUnitController {
    private service = new MeasureUnitService();

    list = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.list(requireCompanyUuid(req)));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as MeasureUnitBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as MeasureUnitBody));
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
