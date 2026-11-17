import { Response } from "express";
import { AuthRequest } from "../../middlewares/AuthMiddleware";
import { PlatformCompaniesService } from "../../services/platform/PlatformCompaniesService";
import { CompanyUsersService } from "../../services/CompanyUsersService";
import type { CompanyBody } from "../../schemas/CompanySchema";
import type { PaginatedSearchQuery } from "../../schemas/SharedSchema";
import type { CompanyStatusBody } from "../../schemas/platform/PlatformCompaniesSchema";
import type { CompanyUserBody, CompanyUserStatusBody } from "../../schemas/CompanyUserSchema";
import { AppResponse } from "../../utils/AppResponse";

export class PlatformCompaniesController {
    private service = new PlatformCompaniesService();
    private usersService = new CompanyUsersService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(req.query as unknown as PaginatedSearchQuery);
        return AppResponse.send(res, items, meta);
    };

    get = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.get(req.params.uuid as string));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(req.body as CompanyBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(req.params.uuid as string, req.body as CompanyBody));
    };

    setStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as CompanyStatusBody;
        return AppResponse.send(res, await this.service.setStatus(req.params.uuid as string, status));
    };

    listUsers = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.usersService.list(req.params.uuid as string, req.query as unknown as PaginatedSearchQuery);
        return AppResponse.send(res, items, meta);
    };

    createUser = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.usersService.create(req.params.uuid as string, req.body as CompanyUserBody));
    };

    updateUser = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.usersService.update(
            req.params.uuid as string,
            req.params.userUuid as string,
            req.user!.userUUID,
            req.body as CompanyUserBody,
        ));
    };

    setUserStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as CompanyUserStatusBody;
        return AppResponse.send(res, await this.usersService.setStatus(
            req.params.uuid as string,
            req.params.userUuid as string,
            req.user!.userUUID,
            status,
        ));
    };
}
