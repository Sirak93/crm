import { Router } from "express";
import { Permission } from "armstock-shared";
import { CompanyMemberMiddleware } from "../middlewares/CompanyMemberMiddleware";
import { PermissionMiddleware } from "../middlewares/PermissionMiddleware";
import { validate } from "../middlewares/Validate";
import { asyncHandler } from "../utils/asyncHandler";
import { RecipeController } from "../controllers/RecipeController";
import { RecipeBodySchema, RecipesQuerySchema, RecipeStatusBodySchema } from "../schemas/RecipeSchema";
import { UuidParamsSchema } from "../schemas/SharedSchema";

// All recipe routes live here, so a future module check is one line.
const router = Router();
const recipeController = new RecipeController();
const uuidParams = validate(UuidParamsSchema, "params");

router.use(CompanyMemberMiddleware);

router.get("/", PermissionMiddleware(Permission.RECIPE_VIEW), validate(RecipesQuerySchema, "query"), asyncHandler(recipeController.list));
router.get("/:uuid", PermissionMiddleware(Permission.RECIPE_VIEW), uuidParams, asyncHandler(recipeController.get));
router.post("/", PermissionMiddleware(Permission.RECIPE_ADD), validate(RecipeBodySchema), asyncHandler(recipeController.create));
router.put("/:uuid", PermissionMiddleware(Permission.RECIPE_EDIT), uuidParams, validate(RecipeBodySchema), asyncHandler(recipeController.update));
router.patch(
    "/:uuid/status",
    PermissionMiddleware(Permission.RECIPE_ARCHIVE),
    uuidParams,
    validate(RecipeStatusBodySchema),
    asyncHandler(recipeController.setStatus),
);
router.delete("/:uuid", PermissionMiddleware(Permission.RECIPE_DELETE), uuidParams, asyncHandler(recipeController.delete));

export default router;
