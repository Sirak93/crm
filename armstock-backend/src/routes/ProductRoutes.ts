import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ProductController } from "../controllers/ProductController";
import { ProductBodySchema, ProductCreateBodySchema, ProductsQuerySchema, ProductStatusBodySchema } from "../schemas/ProductSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const productController = new ProductController();
const uuidParams = validate(UuidParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get("/", PermissionMiddleware(Permission.PRODUCT_VIEW), validate(ProductsQuerySchema, "query"), asyncHandler(productController.list));
router.post("/", PermissionMiddleware(Permission.PRODUCT_ADD), validate(ProductCreateBodySchema), asyncHandler(productController.create));
router.put(
    "/:uuid",
    PermissionMiddleware(Permission.PRODUCT_EDIT),
    uuidParams,
    validate(ProductBodySchema),
    asyncHandler(productController.update),
);
router.patch(
    "/:uuid/status",
    PermissionMiddleware(Permission.PRODUCT_ARCHIVE),
    uuidParams,
    validate(ProductStatusBodySchema),
    asyncHandler(productController.setStatus),
);
router.delete("/:uuid", PermissionMiddleware(Permission.PRODUCT_DELETE), uuidParams, asyncHandler(productController.delete));

export default router;
