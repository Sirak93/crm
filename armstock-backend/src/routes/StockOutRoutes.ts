import { Router } from "express";
import { COMPANY_LOGIN_ROLES, STOCK_MANAGER_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { StockOutController } from "../controllers/StockOutController";
import { StockOutBodySchema, StockOutFiltersSchema, StockOutsQuerySchema } from "../schemas/StockOutSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const stockOutController = new StockOutController();
const canManage = RoleMiddleware([...STOCK_MANAGER_ROLES]);
const uuidParams = validate(UuidParamsSchema, "params");

router.use(AuthMiddleware, RoleMiddleware([...COMPANY_LOGIN_ROLES]));

router.get("/", validate(StockOutsQuerySchema, "query"), asyncHandler(stockOutController.list));
router.get("/summary", validate(StockOutFiltersSchema, "query"), asyncHandler(stockOutController.summary));
router.get("/receivers", canManage, asyncHandler(stockOutController.receivers));
router.get("/:uuid", uuidParams, asyncHandler(stockOutController.get));
router.post("/", canManage, validate(StockOutBodySchema), asyncHandler(stockOutController.create));
// The service also checks that the user is the document's creator.
router.put("/:uuid", canManage, uuidParams, validate(StockOutBodySchema), asyncHandler(stockOutController.update));
router.delete("/:uuid", canManage, uuidParams, asyncHandler(stockOutController.delete));

export default router;
