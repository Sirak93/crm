import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { CompanyUsersService } from "../../services/CompanyUsersService";
import type { PaginatedSearchQuery } from "../../schemas/SharedSchema";
import type { CompanyUserBody, CompanyUserStatusBody } from "../../schemas/CompanyUserSchema";
import { AppResponse } from "../../utils/AppResponse";
import { requireCompanyUuid } from "../../utils/requireCompanyUuid";

/** The Company Owner's own company users. */
export class CompanyUsersController {
    private service = new CompanyUsersService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as PaginatedSearchQuery);
        return AppResponse.send(res, items, meta);
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as CompanyUserBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.user!.userUUID,
            req.body as CompanyUserBody,
        ));
    };

    setStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as CompanyUserStatusBody;
        return AppResponse.send(res, await this.service.setStatus(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.user!.userUUID,
            status,
        ));
    };
}
