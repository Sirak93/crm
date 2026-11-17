import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { CompanyService } from "../../services/CompanyService";
import type { CompanyBody } from "../../schemas/CompanySchema";
import { AppResponse } from "../../utils/AppResponse";
import { requireCompanyUuid } from "../../utils/requireCompanyUuid";

/** The logged-in user's own company. */
export class CompanyController {
    private service = new CompanyService();

    get = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.get(requireCompanyUuid(req)));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.body as CompanyBody));
    };
}
