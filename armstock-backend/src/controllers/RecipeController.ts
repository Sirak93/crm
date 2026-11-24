import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { RecipeService } from "../services/RecipeService";
import type { RecipeBody, RecipesQuery } from "../schemas/RecipeSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company recipes. */
export class RecipeController {
    private service = new RecipeService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as RecipesQuery);
        return AppResponse.send(res, items, meta);
    };

    get = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.get(requireCompanyUuid(req), req.params.uuid as string));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.user!.userUUID, req.body as RecipeBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as RecipeBody));
    };
}
