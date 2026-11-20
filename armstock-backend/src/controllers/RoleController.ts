import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { RoleService } from "../services/RoleService";
import type { RoleBody } from "../schemas/RoleSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company roles. */
export class RoleController {
    private service = new RoleService();

    list = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.list(requireCompanyUuid(req)));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.user!, req.body as RoleBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        const result = await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.user!, req.body as RoleBody);
        return AppResponse.send(res, result);
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
