import { Router } from "express";
import { CATALOG_MANAGER_ROLES, COMPANY_LOGIN_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ProductController } from "../controllers/ProductController";
import { ProductBodySchema, ProductCreateBodySchema, ProductsQuerySchema, ProductStatusBodySchema } from "../schemas/ProductSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const productController = new ProductController();
const canManage = RoleMiddleware([...CATALOG_MANAGER_ROLES]);

router.use(AuthMiddleware);

router.get("/", RoleMiddleware([...COMPANY_LOGIN_ROLES]), validate(ProductsQuerySchema, "query"), asyncHandler(productController.list));
router.post("/", canManage, validate(ProductCreateBodySchema), asyncHandler(productController.create));
router.put("/:uuid", canManage, validate(UuidParamsSchema, "params"), validate(ProductBodySchema), asyncHandler(productController.update));
router.patch(
    "/:uuid/status",
    canManage,
    validate(UuidParamsSchema, "params"),
    validate(ProductStatusBodySchema),
    asyncHandler(productController.setStatus),
);

export default router;
