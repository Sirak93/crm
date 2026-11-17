import { Router } from "express";
import { UserRole } from "armstock-shared";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { RoleMiddleware } from "../middlewares/RoleMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { PlatformDatabaseController } from "../controllers/platform/PlatformDatabaseController";
import { PlatformLogsController } from "../controllers/platform/PlatformLogsController";
import { PlatformLogsQuerySchema } from "../schemas/platform/PlatformLogsSchema";

const router = Router();
const databaseController = new PlatformDatabaseController();
const logsController = new PlatformLogsController();

router.use(AuthMiddleware, RoleMiddleware([UserRole.PLATFORM_OWNER]));

router.get("/database/storage", asyncHandler(databaseController.getStorage));

router.get("/logs", validate(PlatformLogsQuerySchema, "query"), asyncHandler(logsController.list));
router.delete("/logs", asyncHandler(logsController.clear));

export default router;
