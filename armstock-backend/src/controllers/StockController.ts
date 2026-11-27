import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { StockService } from "../services/StockService";
import { StockExportService } from "../services/StockExportService";
import type {
    KitchenBalanceQuery,
    ProductMovementExportQuery,
    ProductMovementQuery,
    StockBalanceFilters,
    StockBalanceQuery,
    StockMovementExportQuery,
    StockMovementQuery,
} from "../schemas/StockSchema";
import { XLSX_CONTENT_TYPE } from "../constants/ExportTexts";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company stock balance. */
export class StockController {
    private service = new StockService();
    private exportService = new StockExportService();

    balance = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.balanceList(requireCompanyUuid(req), req.query as unknown as StockBalanceQuery);
        return AppResponse.send(res, items, meta);
    };

    balanceSummary = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.balanceSummary(requireCompanyUuid(req), req.query as unknown as StockBalanceFilters));
    };

    movement = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.movementList(requireCompanyUuid(req), req.query as unknown as StockMovementQuery);
        return AppResponse.send(res, items, meta);
    };

    productMovement = async (req: AuthRequest, res: Response) => {
        const { data, meta } = await this.service.productMovement(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.query as unknown as ProductMovementQuery,
        );
        return AppResponse.send(res, data, meta);
    };

    movementExport = async (req: AuthRequest, res: Response) => {
        const file = await this.exportService.movement(requireCompanyUuid(req), req.query as unknown as StockMovementExportQuery);
        return AppResponse.file(res, file.fileName, XLSX_CONTENT_TYPE, file.content);
    };

    productMovementExport = async (req: AuthRequest, res: Response) => {
        const file = await this.exportService.productMovement(
            requireCompanyUuid(req),
            req.params.uuid as string,
            req.query as unknown as ProductMovementExportQuery,
        );
        return AppResponse.file(res, file.fileName, XLSX_CONTENT_TYPE, file.content);
    };

    kitchenBalance = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.kitchenBalanceList(requireCompanyUuid(req), req.query as unknown as KitchenBalanceQuery);
        return AppResponse.send(res, items, meta);
    };
}
