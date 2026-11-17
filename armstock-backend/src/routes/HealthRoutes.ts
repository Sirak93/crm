import { Router } from "express";
import { HealthController } from "../controllers/HealthController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(HealthController.getStatus));

export default router;
