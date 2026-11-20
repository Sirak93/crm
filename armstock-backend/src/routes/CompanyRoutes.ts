import { Router } from "express";
import { UserRole } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { CompanyController } from "../controllers/company/CompanyController";
import { CompanyUsersController } from "../controllers/company/CompanyUsersController";
import { CompanyBodySchema } from "../schemas/CompanySchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";
import {
    CompanyUserCreateSchema,
    CompanyUsersQuerySchema,
    CompanyUserStatusBodySchema,
    CompanyUserUpdateSchema,
} from "../schemas/CompanyUserSchema";

const router = Router();
const companyController = new CompanyController();
const usersController = new CompanyUsersController();

router.use(AuthMiddleware, RoleMiddleware([UserRole.COMPANY_OWNER]));

router.get("/", asyncHandler(companyController.get));
router.put("/", validate(CompanyBodySchema), asyncHandler(companyController.update));

router.get("/users", validate(CompanyUsersQuerySchema, "query"), asyncHandler(usersController.list));
router.post("/users", validate(CompanyUserCreateSchema), asyncHandler(usersController.create));
router.put(
    "/users/:uuid",
    validate(UuidParamsSchema, "params"),
    validate(CompanyUserUpdateSchema),
    asyncHandler(usersController.update),
);
router.patch(
    "/users/:uuid/status",
    validate(UuidParamsSchema, "params"),
    validate(CompanyUserStatusBodySchema),
    asyncHandler(usersController.setStatus),
);

export default router;
