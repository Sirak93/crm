import { Router } from "express";
import { COMPANY_LOGIN_ROLES, STOCK_MANAGER_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockInController } from "../controllers/StockInController";
import { StockInBodySchema, StockInFiltersSchema, StockInsQuerySchema } from "../schemas/StockInSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const stockInController = new StockInController();
const canManage = RoleMiddleware([...STOCK_MANAGER_ROLES]);
const uuidParams = validate(UuidParamsSchema, "params");

router.use(AuthMiddleware, RoleMiddleware([...COMPANY_LOGIN_ROLES]));

router.get("/", validate(StockInsQuerySchema, "query"), asyncHandler(stockInController.list));
router.get("/summary", validate(StockInFiltersSchema, "query"), asyncHandler(stockInController.summary));
router.get("/:uuid", uuidParams, asyncHandler(stockInController.get));
router.post("/", canManage, validate(StockInBodySchema), asyncHandler(stockInController.create));
// The service also checks that the user is the document's creator.
router.put("/:uuid", canManage, uuidParams, validate(StockInBodySchema), asyncHandler(stockInController.update));
router.delete("/:uuid", canManage, uuidParams, asyncHandler(stockInController.delete));

export default router;
