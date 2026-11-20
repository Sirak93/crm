import { Router } from "express";
import { UserRole } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { PlatformDatabaseController } from "../controllers/platform/PlatformDatabaseController";
import { PlatformLogsController } from "../controllers/platform/PlatformLogsController";
import { PlatformLogsQuerySchema } from "../schemas/platform/PlatformLogsSchema";
import { PlatformCompaniesController } from "../controllers/platform/PlatformCompaniesController";
import { CompanyBodySchema } from "../schemas/CompanySchema";
import { PaginatedSearchQuerySchema, UuidParamsSchema } from "../schemas/SharedSchema";
import { CompanyStatusBodySchema, CompanyUserParamsSchema } from "../schemas/platform/PlatformCompaniesSchema";
import {
    CompanyUserCreateSchema,
    CompanyUsersQuerySchema,
    CompanyUserStatusBodySchema,
    CompanyUserUpdateSchema,
} from "../schemas/CompanyUserSchema";

const router = Router();
const databaseController = new PlatformDatabaseController();
const logsController = new PlatformLogsController();
const companiesController = new PlatformCompaniesController();

router.use(AuthMiddleware, RoleMiddleware([UserRole.PLATFORM_OWNER]));

router.get("/companies", validate(PaginatedSearchQuerySchema, "query"), asyncHandler(companiesController.list));
router.post("/companies", validate(CompanyBodySchema), asyncHandler(companiesController.create));
router.put(
    "/companies/:uuid",
    validate(UuidParamsSchema, "params"),
    validate(CompanyBodySchema),
    asyncHandler(companiesController.update),
);
router.patch(
    "/companies/:uuid/status",
    validate(UuidParamsSchema, "params"),
    validate(CompanyStatusBodySchema),
    asyncHandler(companiesController.setStatus),
);
router.get("/companies/:uuid", validate(UuidParamsSchema, "params"), asyncHandler(companiesController.get));

router.get(
    "/companies/:uuid/users",
    validate(UuidParamsSchema, "params"),
    validate(CompanyUsersQuerySchema, "query"),
    asyncHandler(companiesController.listUsers),
);
router.post(
    "/companies/:uuid/users",
    validate(UuidParamsSchema, "params"),
    validate(CompanyUserCreateSchema),
    asyncHandler(companiesController.createUser),
);
router.put(
    "/companies/:uuid/users/:userUuid",
    validate(CompanyUserParamsSchema, "params"),
    validate(CompanyUserUpdateSchema),
    asyncHandler(companiesController.updateUser),
);
router.patch(
    "/companies/:uuid/users/:userUuid/status",
    validate(CompanyUserParamsSchema, "params"),
    validate(CompanyUserStatusBodySchema),
    asyncHandler(companiesController.setUserStatus),
);

router.get("/database/storage", asyncHandler(databaseController.getStorage));

router.get("/logs", validate(PlatformLogsQuerySchema, "query"), asyncHandler(logsController.list));
router.delete("/logs", asyncHandler(logsController.clear));

export default router;
