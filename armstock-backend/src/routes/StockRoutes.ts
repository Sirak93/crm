import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockController } from "../controllers/StockController";
import { StockBalanceFiltersSchema, StockBalanceQuerySchema } from "../schemas/StockSchema";

const router = Router();
const stockController = new StockController();

router.use(CompanyMemberMiddleware, PermissionMiddleware(Permission.STOCK_BALANCE_VIEW));

router.get("/balance", validate(StockBalanceQuerySchema, "query"), asyncHandler(stockController.balance));
router.get("/balance/summary", validate(StockBalanceFiltersSchema, "query"), asyncHandler(stockController.balanceSummary));

export default router;
