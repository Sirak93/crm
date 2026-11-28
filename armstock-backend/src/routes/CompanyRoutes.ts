import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { CompanyUsersController } from "../controllers/company/CompanyUsersController";
import { UuidParamsSchema } from "../schemas/SharedSchema";
import {
    CompanyUserCreateSchema,
    CompanyUserAccessBodySchema,
    CompanyUsersQuerySchema,
    CompanyUserStatusBodySchema,
    CompanyUserUpdateSchema,
} from "../schemas/CompanyUserSchema";

const router = Router();
const usersController = new CompanyUsersController();
const canEditUser = PermissionMiddleware(Permission.USER_EDIT);
const uuidParams = validate(UuidParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get(
    "/users",
    PermissionMiddleware(Permission.USER_VIEW),
    validate(CompanyUsersQuerySchema, "query"),
    asyncHandler(usersController.list),
);
router.post("/users", PermissionMiddleware(Permission.USER_ADD), validate(CompanyUserCreateSchema), asyncHandler(usersController.create));
router.put("/users/:uuid", canEditUser, uuidParams, validate(CompanyUserUpdateSchema), asyncHandler(usersController.update));
router.put(
    "/users/:uuid/access",
    PermissionMiddleware(Permission.MANAGE_USER_PERMISSIONS),
    uuidParams,
    validate(CompanyUserAccessBodySchema),
    asyncHandler(usersController.setAccess),
);
router.patch("/users/:uuid/status", canEditUser, uuidParams, validate(CompanyUserStatusBodySchema), asyncHandler(usersController.setStatus));

export default router;
