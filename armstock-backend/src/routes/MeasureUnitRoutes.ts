import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { MeasureUnitController } from "../controllers/MeasureUnitController";
import { MeasureUnitBodySchema } from "../schemas/MeasureUnitSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

const router = Router();
const unitController = new MeasureUnitController();
const uuidParams = validate(UuidParamsSchema, "params");

// Reference data every member reads (product form, filters) - no view permission.
router.use(CompanyMemberMiddleware);

router.get("/", asyncHandler(unitController.list));
router.post("/", PermissionMiddleware(Permission.MEASURE_UNIT_ADD), validate(MeasureUnitBodySchema), asyncHandler(unitController.create));
router.put(
    "/:uuid",
    PermissionMiddleware(Permission.MEASURE_UNIT_EDIT),
    uuidParams,
    validate(MeasureUnitBodySchema),
    asyncHandler(unitController.update),
);
router.delete("/:uuid", PermissionMiddleware(Permission.MEASURE_UNIT_DELETE), uuidParams, asyncHandler(unitController.delete));

export default router;
