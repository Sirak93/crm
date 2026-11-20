import { Router } from "express";
import { COMPANY_LOGIN_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockController } from "../controllers/StockController";
import { StockBalanceFiltersSchema, StockBalanceQuerySchema } from "../schemas/StockSchema";

const router = Router();
const stockController = new StockController();

router.use(AuthMiddleware, RoleMiddleware([...COMPANY_LOGIN_ROLES]));

router.get("/balance", validate(StockBalanceQuerySchema, "query"), asyncHandler(stockController.balance));
router.get("/balance/summary", validate(StockBalanceFiltersSchema, "query"), asyncHandler(stockController.balanceSummary));

export default router;
