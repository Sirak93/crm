import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { CompanyUsersService } from "../../services/CompanyUsersService";
import type {
    CompanyUserBody,
    CompanyUserCreateBody,
    CompanyUserRoleBody,
    CompanyUserStatusBody,
    CompanyUsersQuery,
} from "../../schemas/CompanyUserSchema";
import { AppResponse } from "../../utils/AppResponse";
import { requireCompanyUuid } from "../../utils/requireCompanyUuid";

/** The logged-in user's own company users. */
export class CompanyUsersController {
    private service = new CompanyUsersService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as CompanyUsersQuery);
        return AppResponse.send(res, items, meta);
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as CompanyUserCreateBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.user!,
            req.body as CompanyUserBody,
        ));
    };

    setRole = async (req: AuthRequest, res: Response) => {
        const { roleUuid } = req.body as CompanyUserRoleBody;
        return AppResponse.send(res, await this.service.setRole(requireCompanyUuid(req), req.params.uuid as string, req.user!, roleUuid));
    };

    setStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as CompanyUserStatusBody;
        return AppResponse.send(res, await this.service.setStatus(requireCompanyUuid(req), req.params.uuid as string, req.user!, status));
    };
}
