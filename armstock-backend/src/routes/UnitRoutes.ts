import { Router } from "express";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { UnitController } from "../controllers/UnitController";

const router = Router();
const unitController = new UnitController();

router.get("/", AuthMiddleware, asyncHandler(unitController.list));

export default router;
