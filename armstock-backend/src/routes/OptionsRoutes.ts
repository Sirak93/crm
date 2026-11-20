import { Router } from "express";
import { COMPANY_LOGIN_ROLES } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { OptionsController } from "../controllers/OptionsController";
import { ProductOptionsQuerySchema, SupplierOptionsQuerySchema } from "../schemas/OptionsSchema";

const router = Router();
const optionsController = new OptionsController();

// Open to every logged-in company member - no permission, so a form never breaks for lack of another area's view right.
router.use(AuthMiddleware, RoleMiddleware([...COMPANY_LOGIN_ROLES]));

router.get("/products", validate(ProductOptionsQuerySchema, "query"), asyncHandler(optionsController.products));
router.get("/suppliers", validate(SupplierOptionsQuerySchema, "query"), asyncHandler(optionsController.suppliers));
router.get("/receivers", asyncHandler(optionsController.receivers));
router.get("/roles", asyncHandler(optionsController.roles));

export default router;
