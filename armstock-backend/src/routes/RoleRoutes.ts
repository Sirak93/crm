import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { RoleController } from "../controllers/RoleController";
import { RoleBodySchema } from "../schemas/RoleSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const roleController = new RoleController();
const uuidParams = validate(UuidParamsSchema, "params");

// Anything about rights: the Owner or MANAGE_USER_PERMISSIONS.
router.use(CompanyMemberMiddleware, PermissionMiddleware(Permission.MANAGE_USER_PERMISSIONS));

router.get("/", asyncHandler(roleController.list));
router.post("/", validate(RoleBodySchema), asyncHandler(roleController.create));
router.put("/:uuid", uuidParams, validate(RoleBodySchema), asyncHandler(roleController.update));
router.delete("/:uuid", uuidParams, asyncHandler(roleController.delete));

export default router;
