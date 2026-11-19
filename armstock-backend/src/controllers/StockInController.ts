import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { StockInService } from "../services/StockInService";
import type { StockInBody, StockInFilters, StockInsQuery } from "../schemas/StockInSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company stock-in documents. */
export class StockInController {
    private service = new StockInService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as StockInsQuery);
        return AppResponse.send(res, items, meta);
    };

    summary = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.summary(requireCompanyUuid(req), req.query as unknown as StockInFilters));
    };

    get = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.get(requireCompanyUuid(req), req.params.uuid as string));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.user!.userUUID, req.body as StockInBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        const result = await this.service.update(requireCompanyUuid(req), req.user!.userUUID, req.params.uuid as string, req.body as StockInBody);
        return AppResponse.send(res, result);
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.user!.userUUID, req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
