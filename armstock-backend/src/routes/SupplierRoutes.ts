import { Router } from "express";
import { COMPANY_LOGIN_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { SupplierController } from "../controllers/SupplierController";
import { SupplierBodySchema, SuppliersQuerySchema, SupplierStatusBodySchema } from "../schemas/SupplierSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const supplierController = new SupplierController();
const uuidParams = validate(UuidParamsSchema, "params");

// Every company login role manages suppliers, the Accountant included.
router.use(AuthMiddleware, RoleMiddleware([...COMPANY_LOGIN_ROLES]));

router.get("/", validate(SuppliersQuerySchema, "query"), asyncHandler(supplierController.list));
router.post("/", validate(SupplierBodySchema), asyncHandler(supplierController.create));
router.put("/:uuid", uuidParams, validate(SupplierBodySchema), asyncHandler(supplierController.update));
router.patch("/:uuid/status", uuidParams, validate(SupplierStatusBodySchema), asyncHandler(supplierController.setStatus));
router.delete("/:uuid", uuidParams, asyncHandler(supplierController.delete));

export default router;
