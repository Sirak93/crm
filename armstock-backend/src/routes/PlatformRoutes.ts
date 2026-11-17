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
import { CompanyOwnerBodySchema, CompanyStatusBodySchema } from "../schemas/platform/PlatformCompaniesSchema";

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
router.post(
    "/companies/:uuid/owner",
    validate(UuidParamsSchema, "params"),
    validate(CompanyOwnerBodySchema),
    asyncHandler(companiesController.addOwner),
);

router.get("/database/storage", asyncHandler(databaseController.getStorage));

router.get("/logs", validate(PlatformLogsQuerySchema, "query"), asyncHandler(logsController.list));
router.delete("/logs", asyncHandler(logsController.clear));

export default router;
