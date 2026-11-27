import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockOutController } from "../controllers/StockOutController";
import { StockOutBodySchema, StockOutExportQuerySchema, StockOutFiltersSchema, StockOutsQuerySchema } from "../schemas/StockOutSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const stockOutController = new StockOutController();
const canView = PermissionMiddleware(Permission.STOCK_OUT_VIEW);
const canCreate = PermissionMiddleware(Permission.STOCK_OUT_CREATE);
const canEdit = PermissionMiddleware(Permission.STOCK_OUT_EDIT);
const canDelete = PermissionMiddleware(Permission.STOCK_OUT_DELETE);
const uuidParams = validate(UuidParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get("/", canView, validate(StockOutsQuerySchema, "query"), asyncHandler(stockOutController.list));
router.get("/summary", canView, validate(StockOutFiltersSchema, "query"), asyncHandler(stockOutController.summary));
router.get("/export", canView, validate(StockOutExportQuerySchema, "query"), asyncHandler(stockOutController.export));
router.get("/:uuid", canView, uuidParams, asyncHandler(stockOutController.get));
router.post("/", canCreate, validate(StockOutBodySchema), asyncHandler(stockOutController.create));
// The service also checks that the user is the document's creator.
router.put("/:uuid", canEdit, uuidParams, validate(StockOutBodySchema), asyncHandler(stockOutController.update));
router.delete("/:uuid", canDelete, uuidParams, asyncHandler(stockOutController.delete));

export default router;
