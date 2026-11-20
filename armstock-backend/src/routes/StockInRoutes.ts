import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockInController } from "../controllers/StockInController";
import { StockInBodySchema, StockInFiltersSchema, StockInsQuerySchema } from "../schemas/StockInSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const stockInController = new StockInController();
const canView = PermissionMiddleware(Permission.STOCK_IN_VIEW);
const canCreate = PermissionMiddleware(Permission.STOCK_IN_CREATE);
const canEdit = PermissionMiddleware(Permission.STOCK_IN_EDIT);
const canDelete = PermissionMiddleware(Permission.STOCK_IN_DELETE);
const uuidParams = validate(UuidParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get("/", canView, validate(StockInsQuerySchema, "query"), asyncHandler(stockInController.list));
router.get("/summary", canView, validate(StockInFiltersSchema, "query"), asyncHandler(stockInController.summary));
router.get("/:uuid", canView, uuidParams, asyncHandler(stockInController.get));
router.post("/", canCreate, validate(StockInBodySchema), asyncHandler(stockInController.create));
// The service also checks that the user is the document's creator.
router.put("/:uuid", canEdit, uuidParams, validate(StockInBodySchema), asyncHandler(stockInController.update));
router.delete("/:uuid", canDelete, uuidParams, asyncHandler(stockInController.delete));

export default router;
