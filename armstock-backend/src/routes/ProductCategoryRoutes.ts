import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ProductCategoryController } from "../controllers/ProductCategoryController";
import { ProductCategoryBodySchema } from "../schemas/ProductCategorySchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const categoryController = new ProductCategoryController();
const uuidParams = validate(UuidParamsSchema, "params");

// Reference data every member reads (product form, filters) - no view permission.
router.use(CompanyMemberMiddleware);

router.get("/", asyncHandler(categoryController.list));
router.post(
    "/",
    PermissionMiddleware(Permission.PRODUCT_CATEGORY_ADD),
    validate(ProductCategoryBodySchema),
    asyncHandler(categoryController.create),
);
router.put(
    "/:uuid",
    PermissionMiddleware(Permission.PRODUCT_CATEGORY_EDIT),
    uuidParams,
    validate(ProductCategoryBodySchema),
    asyncHandler(categoryController.update),
);
router.delete("/:uuid", PermissionMiddleware(Permission.PRODUCT_CATEGORY_DELETE), uuidParams, asyncHandler(categoryController.delete));

export default router;
