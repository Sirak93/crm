import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockOutController } from "../controllers/StockOutController";
import { StockOutBodySchema, StockOutFiltersSchema, StockOutsQuerySchema } from "../schemas/StockOutSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const stockOutController = new StockOutController();
const canView = PermissionMiddleware(Permission.STOCK_OUT_VIEW);
const canCreate = PermissionMiddleware(Permission.STOCK_OUT_CREATE);
const uuidParams = validate(UuidParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get("/", canView, validate(StockOutsQuerySchema, "query"), asyncHandler(stockOutController.list));
router.get("/summary", canView, validate(StockOutFiltersSchema, "query"), asyncHandler(stockOutController.summary));
router.get("/:uuid", canView, uuidParams, asyncHandler(stockOutController.get));
router.post("/", canCreate, validate(StockOutBodySchema), asyncHandler(stockOutController.create));
// Edit and delete need the create permission; the service also checks that the user is the document's creator.
router.put("/:uuid", canCreate, uuidParams, validate(StockOutBodySchema), asyncHandler(stockOutController.update));
router.delete("/:uuid", canCreate, uuidParams, asyncHandler(stockOutController.delete));

export default router;
