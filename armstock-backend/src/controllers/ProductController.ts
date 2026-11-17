import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { ProductService } from "../services/ProductService";
import type { ProductBody, ProductCreateBody, ProductsQuery, ProductStatusBody } from "../schemas/ProductSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company products. */
export class ProductController {
    private service = new ProductService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as ProductsQuery);
        return AppResponse.send(res, items, meta);
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as ProductCreateBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as ProductBody));
    };

    setStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as ProductStatusBody;
        return AppResponse.send(res, await this.service.setStatus(requireCompanyUuid(req), req.params.uuid as string, status));
    };
}
