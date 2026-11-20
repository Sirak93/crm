import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { StockService } from "../services/StockService";
import type { StockBalanceFilters, StockBalanceQuery } from "../schemas/StockSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company stock balance. */
export class StockController {
    private service = new StockService();

    balance = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.balanceList(requireCompanyUuid(req), req.query as unknown as StockBalanceQuery);
        return AppResponse.send(res, items, meta);
    };

    balanceSummary = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.balanceSummary(requireCompanyUuid(req), req.query as unknown as StockBalanceFilters));
    };
}
