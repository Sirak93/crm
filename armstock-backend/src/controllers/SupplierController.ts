import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { SupplierService } from "../services/SupplierService";
import type { SupplierBody, SupplierContactBody, SuppliersQuery, SupplierStatusBody } from "../schemas/SupplierSchema";
import { AppResponse } from "../utils/AppResponse";
import { requireCompanyUuid } from "../utils/requireCompanyUuid";

/** The logged-in user's company suppliers. */
export class SupplierController {
    private service = new SupplierService();

    list = async (req: AuthRequest, res: Response) => {
        const { items, meta } = await this.service.list(requireCompanyUuid(req), req.query as unknown as SuppliersQuery);
        return AppResponse.send(res, items, meta);
    };

    create = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.create(requireCompanyUuid(req), req.body as SupplierBody));
    };

    update = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.update(requireCompanyUuid(req), req.params.uuid as string, req.body as SupplierBody));
    };

    setStatus = async (req: AuthRequest, res: Response) => {
        const { status } = req.body as SupplierStatusBody;
        return AppResponse.send(res, await this.service.setStatus(requireCompanyUuid(req), req.params.uuid as string, status));
    };

    delete = async (req: AuthRequest, res: Response) => {
        await this.service.delete(requireCompanyUuid(req), req.params.uuid as string);
        return AppResponse.send(res, { success: true });
    };

    addContact = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.addContact(requireCompanyUuid(req), req.params.uuid as string, req.body as SupplierContactBody));
    };

    updateContact = async (req: AuthRequest, res: Response) => {
        const { uuid, contactUuid } = req.params as { uuid: string; contactUuid: string };
        return AppResponse.send(res, await this.service.updateContact(requireCompanyUuid(req), uuid, contactUuid, req.body as SupplierContactBody));
    };

    deleteContact = async (req: AuthRequest, res: Response) => {
        const { uuid, contactUuid } = req.params as { uuid: string; contactUuid: string };
        await this.service.deleteContact(requireCompanyUuid(req), uuid, contactUuid);
        return AppResponse.send(res, { success: true });
    };
}
