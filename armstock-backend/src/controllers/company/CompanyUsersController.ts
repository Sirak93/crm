import { Response } from "express";
import { can, lockedPermissions, Permission } from "armstock-shared";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { CompanyUsersService } from "../../services/CompanyUsersService";
import type {
    CompanyUserBody,
    CompanyUserCreateBody,
    CompanyUserAccessBody,
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
        return AppResponse.send(res, await this.service.create(
            requireCompanyUuid(req),
            req.body as CompanyUserCreateBody,
            can(req.user!.accountType, req.user!.permissions, Permission.MANAGE_USER_PERMISSIONS),
            lockedPermissions(req.user!.accountType),
        ));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.user!,
            req.body as CompanyUserBody,
        ));
    };

    setAccess = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.setAccess(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.user!,
            req.body as CompanyUserAccessBody,
        ));
    };

    setStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as CompanyUserStatusBody;
        return AppResponse.send(res, await this.service.setStatus(requireCompanyUuid(req), req.params.uuid as string, req.user!, status));
    };
}
