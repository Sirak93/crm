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

router.use(CompanyMemberMiddleware);

const canViewBalance = PermissionMiddleware(Permission.STOCK_BALANCE_VIEW);
const canViewMovement = PermissionMiddleware(Permission.STOCK_MOVEMENT_VIEW);
const canViewKitchen = PermissionMiddleware(Permission.KITCHEN_BALANCE_VIEW);

router.get("/balance", canViewBalance, validate(StockBalanceQuerySchema, "query"), asyncHandler(stockController.balance));
router.get("/balance/export", canViewBalance, validate(StockBalanceExportQuerySchema, "query"), asyncHandler(stockController.balanceExport));
router.get("/balance/summary", canViewBalance, validate(StockBalanceFiltersSchema, "query"), asyncHandler(stockController.balanceSummary));
router.get("/movement", canViewMovement, validate(StockMovementQuerySchema, "query"), asyncHandler(stockController.movement));
router.get("/movement/export", canViewMovement, validate(StockMovementExportQuerySchema, "query"), asyncHandler(stockController.movementExport));
router.get(
    "/movement/:uuid/export",
    canViewMovement,
    validate(UuidParamsSchema, "params"),
    validate(ProductMovementExportQuerySchema, "query"),
    asyncHandler(stockController.productMovementExport),
);
router.get(
    "/movement/:uuid",
    canViewMovement,
    validate(UuidParamsSchema, "params"),
    validate(ProductMovementQuerySchema, "query"),
    asyncHandler(stockController.productMovement),
);
router.get("/kitchen-balance", canViewKitchen, validate(KitchenBalanceQuerySchema, "query"), asyncHandler(stockController.kitchenBalance));
router.get(
    "/kitchen-balance/export",
    canViewKitchen,
    validate(KitchenBalanceExportQuerySchema, "query"),
    asyncHandler(stockController.kitchenBalanceExport),
);

export default router;
