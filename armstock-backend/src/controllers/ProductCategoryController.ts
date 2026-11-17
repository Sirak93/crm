import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { ProductCategoryService } from "../services/ProductCategoryService";
import type { ProductCategoryBody } from "../schemas/ProductCategorySchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company product categories. */
export class ProductCategoryController {
    private service = new ProductCategoryService();

    list = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.list(requireCompanyUuid(req)));
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as ProductCategoryBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as ProductCategoryBody));
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };
}
