import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { PlatformCompaniesService } from "../../services/platform/PlatformCompaniesService";
import type {
    CompanyActiveBody,
    CompanyBody,
    PlatformCompaniesQuery,
} from "../../schemas/platform/PlatformCompaniesSchema";
import { AppResponse } from "../../utils/AppResponse";

export class PlatformCompaniesController {
    private service = new PlatformCompaniesService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(req.query as unknown as PlatformCompaniesQuery);
        return AppResponse.send(res, items, meta);
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(req.body as CompanyBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(req.params.uuid as string, req.body as CompanyBody));
    };

    setActive = async (req: AuthRequest, res: Response) => {
        const { isActive } = req.body as CompanyActiveBody;
        return AppResponse.send(res, await this.service.setActive(req.params.uuid as string, isActive));
    };
}
