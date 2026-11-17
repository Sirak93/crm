import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { CompanyStaffService } from "../../services/company/CompanyStaffService";
import type { PaginatedSearchQuery } from "../../schemas/SharedSchema";
import type {
    StaffBody,
    StaffLoginBody,
    StaffLoginStatusBody,
    StaffRoleBody,
} from "../../schemas/company/CompanyStaffSchema";
import { AppResponse } from "../../utils/AppResponse";
import { requireCompanyUuid } from "../../utils/requireCompanyUuid";

export class CompanyStaffController {
    private service = new CompanyStaffService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as PaginatedSearchQuery);
        return AppResponse.send(res, items, meta);
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as StaffBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as StaffBody));
    };

    giveLogin = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.giveLogin(requireCompanyUuid(req), req.params.uuid as string, req.body as StaffLoginBody));
    };

    setRole = async (req: AuthRequest, res: Response) => {
        const { role } = req.body as StaffRoleBody;
        return AppResponse.send(res, await this.service.setRole(requireCompanyUuid(req), req.params.uuid as string, req.user!.userUUID, role));
    };

    setLoginStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as StaffLoginStatusBody;
        return AppResponse.send(res, await this.service.setLoginStatus(requireCompanyUuid(req), req.params.uuid as string, req.user!.userUUID, status));
    };
}
