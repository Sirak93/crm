import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { ProductService } from "../services/ProductService";
import { SupplierService } from "../services/SupplierService";
import { StockOutService } from "../services/StockOutService";
import { RoleService } from "../services/RoleService";
import type { ProductOptionsQuery, SupplierOptionsQuery } from "../schemas/OptionsSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** Picker lists of the logged-in user's company - minimal data, no stock amounts or emails. */
export class OptionsController {
    private productService = new ProductService();
    private supplierService = new SupplierService();
    private stockOutService = new StockOutService();
    private roleService = new RoleService();

    products = async (req: AuthRequest, res: Response) => {
        const query = req.query as unknown as ProductOptionsQuery;
        return AppResponse.send(res, await this.productService.options(requireCompanyUuid(req), query));
    };

    suppliers = async (req: AuthRequest, res: Response) => {
        const query = req.query as unknown as SupplierOptionsQuery;
        return AppResponse.send(res, await this.supplierService.options(requireCompanyUuid(req), query));
    };

    receivers = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.stockOutService.receivers(requireCompanyUuid(req)));
    };

    roles = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.roleService.options(requireCompanyUuid(req)));
    };
}
