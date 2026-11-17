import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { AppResponse } from "../utils/AppResponse";
import { AuthRequest } from "../middlewares/AuthMiddleware";

export class AuthController {
    private authService = new AuthService();

    login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        return AppResponse.send(res, await this.authService.login(email, password));
    };

    refresh = async (req: Request, res: Response) => {
        return AppResponse.send(res, await this.authService.refreshToken(req.body.refreshToken));
    };

    getAuthUser = async (req: AuthRequest, res: Response) => {
        return AppResponse.send(res, { user: await this.authService.getAuthUser(req.user!.userUUID) });
    };

    logout = async (req: AuthRequest, res: Response) => {
        await this.authService.logout(req.user!.userUUID);
        return AppResponse.send(res, { success: true });
    };
}
