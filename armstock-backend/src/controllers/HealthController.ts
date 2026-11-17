import { Request, Response } from "express";
import { HealthService } from "../services/HealthService";
import { AppResponse } from "../utils/AppResponse";

export class HealthController {
    static async getStatus(req: Request, res: Response) {
        return AppResponse.send(res, await HealthService.getStatus());
    }
}
