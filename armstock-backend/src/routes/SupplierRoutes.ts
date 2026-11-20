import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { SupplierController } from "../controllers/SupplierController";
import {
    SupplierBodySchema,
    SupplierContactBodySchema,
    SupplierContactParamsSchema,
    SuppliersQuerySchema,
    SupplierStatusBodySchema,
} from "../schemas/SupplierSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const supplierController = new SupplierController();
const uuidParams = validate(UuidParamsSchema, "params");
const contactParams = validate(SupplierContactParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get("/", PermissionMiddleware(Permission.SUPPLIER_VIEW), validate(SuppliersQuerySchema, "query"), asyncHandler(supplierController.list));
router.post("/", PermissionMiddleware(Permission.SUPPLIER_ADD), validate(SupplierBodySchema), asyncHandler(supplierController.create));
router.put(
    "/:uuid",
    PermissionMiddleware(Permission.SUPPLIER_EDIT),
    uuidParams,
    validate(SupplierBodySchema),
    asyncHandler(supplierController.update),
);
router.patch(
    "/:uuid/status",
    PermissionMiddleware(Permission.SUPPLIER_ARCHIVE),
    uuidParams,
    validate(SupplierStatusBodySchema),
    asyncHandler(supplierController.setStatus),
);
router.delete("/:uuid", PermissionMiddleware(Permission.SUPPLIER_DELETE), uuidParams, asyncHandler(supplierController.delete));

router.post(
    "/:uuid/contacts",
    PermissionMiddleware(Permission.SUPPLIER_CONTACT_ADD),
    uuidParams,
    validate(SupplierContactBodySchema),
    asyncHandler(supplierController.addContact),
);
router.put(
    "/:uuid/contacts/:contactUuid",
    PermissionMiddleware(Permission.SUPPLIER_CONTACT_EDIT),
    contactParams,
    validate(SupplierContactBodySchema),
    asyncHandler(supplierController.updateContact),
);
router.delete(
    "/:uuid/contacts/:contactUuid",
    PermissionMiddleware(Permission.SUPPLIER_CONTACT_DELETE),
    contactParams,
    asyncHandler(supplierController.deleteContact),
);

export default router;
