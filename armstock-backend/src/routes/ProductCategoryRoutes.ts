import { Router } from "express";
import { CATALOG_MANAGER_ROLES, COMPANY_LOGIN_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ProductCategoryController } from "../controllers/ProductCategoryController";
import { ProductCategoryBodySchema } from "../schemas/ProductCategorySchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const categoryController = new ProductCategoryController();
const canManage = RoleMiddleware([...CATALOG_MANAGER_ROLES]);

router.use(AuthMiddleware);

router.get("/", RoleMiddleware([...COMPANY_LOGIN_ROLES]), asyncHandler(categoryController.list));
router.post("/", canManage, validate(ProductCategoryBodySchema), asyncHandler(categoryController.create));
router.put(
    "/:uuid",
    canManage,
    validate(UuidParamsSchema, "params"),
    validate(ProductCategoryBodySchema),
    asyncHandler(categoryController.update),
);
router.delete("/:uuid", canManage, validate(UuidParamsSchema, "params"), asyncHandler(categoryController.delete));

export default router;
