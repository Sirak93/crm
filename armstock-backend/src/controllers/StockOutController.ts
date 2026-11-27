import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { StockOutService } from "../services/StockOutService";
import { StockExportService } from "../services/StockExportService";
import type { StockOutBody, StockOutExportQuery, StockOutFilters, StockOutsQuery } from "../schemas/StockOutSchema";
import { XLSX_CONTENT_TYPE } from "../constants/ExportTexts";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company stock-out documents. */
export class StockOutController {
    private service = new StockOutService();
    private exportService = new StockExportService();

    export = async (req: AuthRequest, res: Response) => {
        const file = await this.exportService.stockOuts(requireCompanyUuid(req), req.query as unknown as StockOutExportQuery);
        return AppResponse.file(res, file.fileName, XLSX_CONTENT_TYPE, file.content);
    };

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as StockOutsQuery);
        return AppResponse.send(res, items, meta);
    };

    summary = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.summary(requireCompanyUuid(req), req.query as unknown as StockOutFilters));
    };

    get = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.get(requireCompanyUuid(req), req.params.uuid as string));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.user!.userUUID, req.body as StockOutBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        const result = await this.service.update(requireCompanyUuid(req), req.user!.userUUID, req.params.uuid as string, req.body as StockOutBody);
        return AppResponse.send(res, result);
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.user!.userUUID, req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
