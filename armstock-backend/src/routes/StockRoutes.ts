import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockController } from "../controllers/StockController";
import {
    KitchenBalanceExportQuerySchema,
    KitchenBalanceQuerySchema,
    ProductMovementExportQuerySchema,
    ProductMovementQuerySchema,
    StockBalanceExportQuerySchema,
    StockBalanceFiltersSchema,
    StockBalanceQuerySchema,
    StockMovementExportQuerySchema,
    StockMovementQuerySchema,
} from "../schemas/StockSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const stockController = new StockController();

router.use(CompanyMemberMiddleware, PermissionMiddleware(Permission.STOCK_BALANCE_VIEW));

router.get("/balance", validate(StockBalanceQuerySchema, "query"), asyncHandler(stockController.balance));
router.get("/balance/export", validate(StockBalanceExportQuerySchema, "query"), asyncHandler(stockController.balanceExport));
router.get("/balance/summary", validate(StockBalanceFiltersSchema, "query"), asyncHandler(stockController.balanceSummary));
router.get("/movement", validate(StockMovementQuerySchema, "query"), asyncHandler(stockController.movement));
router.get("/movement/export", validate(StockMovementExportQuerySchema, "query"), asyncHandler(stockController.movementExport));
router.get(
    "/movement/:uuid/export",
    validate(UuidParamsSchema, "params"),
    validate(ProductMovementExportQuerySchema, "query"),
    asyncHandler(stockController.productMovementExport),
);
router.get(
    "/movement/:uuid",
    validate(UuidParamsSchema, "params"),
    validate(ProductMovementQuerySchema, "query"),
    asyncHandler(stockController.productMovement),
);
router.get("/kitchen-balance", validate(KitchenBalanceQuerySchema, "query"), asyncHandler(stockController.kitchenBalance));
router.get(
    "/kitchen-balance/export",
    validate(KitchenBalanceExportQuerySchema, "query"),
    asyncHandler(stockController.kitchenBalanceExport),
);

export default router;
