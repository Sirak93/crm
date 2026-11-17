import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { AuthMiddleware } from "../middlewares/AuthMiddleware";
import { buildRateLimiter } from "../middlewares/RateLimiter";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { LoginSchema, RefreshSchema } from "../schemas/AuthSchema";

const router = Router();
const authController = new AuthController();

// Login only - the other routes need a valid token, so they aren't a credential-guessing surface.
router.post("/login", buildRateLimiter("LOGIN"), validate(LoginSchema), asyncHandler(authController.login));
router.post("/refresh", validate(RefreshSchema), asyncHandler(authController.refresh));
router.post("/logout", AuthMiddleware, asyncHandler(authController.logout));
router.get("/user", AuthMiddleware, asyncHandler(authController.getAuthUser));

export default router;
