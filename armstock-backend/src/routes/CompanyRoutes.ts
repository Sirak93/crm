import { Router } from "express";
import { UserRole } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { CompanyController } from "../controllers/company/CompanyController";
import { CompanyStaffController } from "../controllers/company/CompanyStaffController";
import { CompanyBodySchema } from "../schemas/CompanySchema";
import { PaginatedSearchQuerySchema, UuidParamsSchema } from "../schemas/SharedSchema";
import {
    StaffBodySchema,
    StaffLoginBodySchema,
    StaffLoginStatusBodySchema,
    StaffRoleBodySchema,
} from "../schemas/company/CompanyStaffSchema";

const router = Router();
const companyController = new CompanyController();
const staffController = new CompanyStaffController();

router.use(AuthMiddleware, RoleMiddleware([UserRole.COMPANY_OWNER]));

router.get("/", asyncHandler(companyController.get));
router.put("/", validate(CompanyBodySchema), asyncHandler(companyController.update));

router.get("/staff", validate(PaginatedSearchQuerySchema, "query"), asyncHandler(staffController.list));
router.post("/staff", validate(StaffBodySchema), asyncHandler(staffController.create));
router.put("/staff/:uuid", validate(UuidParamsSchema, "params"), validate(StaffBodySchema), asyncHandler(staffController.update));
router.post(
    "/staff/:uuid/login",
    validate(UuidParamsSchema, "params"),
    validate(StaffLoginBodySchema),
    asyncHandler(staffController.giveLogin),
);
router.patch(
    "/staff/:uuid/login/role",
    validate(UuidParamsSchema, "params"),
    validate(StaffRoleBodySchema),
    asyncHandler(staffController.setRole),
);
router.patch(
    "/staff/:uuid/login/status",
    validate(UuidParamsSchema, "params"),
    validate(StaffLoginStatusBodySchema),
    asyncHandler(staffController.setLoginStatus),
);

export default router;
