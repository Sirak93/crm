import { Response } from "express";
import { AuthRequest } from "../middlewares/AuthMiddleware";
import { UnitService } from "../services/UnitService";
import { AppResponse } from "../utils/AppResponse";

/** Read-only list for every logged-in user. */
export class UnitController {
    private service = new UnitService();

    list = async (_req: AuthRequest, res: Response) => {
        return AppResponse.send(res, await this.service.list());
    };
}
