import bcrypt from "bcrypt";
import { ErrorCodes, UserRole, type IAuthUser, type ILoginResponse, type IRefreshResponse } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import {
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
    refreshTokenMatches,
    tokenFailureDetails,
} from "../utils/JWT";
import { AuthCacheService } from "./AuthCacheService";

export class AuthService {
    private userRepo = AppDataSource.getRepository(User);

    static toAuthUser(user: User): IAuthUser {
        return {
            uuid: user.uuid,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        };
    }

    /** `user.company` must be loaded. */
    private static assertCanSignIn(user: User): void {
        if (!user.isActive) throw new AppError(ErrorCodes.USER.INACTIVE);
        if (user.company && !user.company.isActive) throw new AppError(ErrorCodes.COMPANY.INACTIVE);
    }

    async login(email: string, password: string): Promise<ILoginResponse> {
        const user = await this.userRepo.findOne({ where: { email }, relations: { company: true } });
        if (!user) throw new AppError(ErrorCodes.AUTH.INVALID_CREDENTIALS);

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new AppError(ErrorCodes.AUTH.INVALID_CREDENTIALS);

        AuthService.assertCanSignIn(user);

        const payload = { userUUID: user.uuid, role: user.role };
        const token = generateToken(payload);
        const refreshToken = generateRefreshToken(payload);

        user.refreshToken = hashRefreshToken(refreshToken);
        user.lastLoginAt = new Date();
        await this.userRepo.save(user);

        await AuthCacheService.set(user);

        return { user: AuthService.toAuthUser(user), token, refreshToken };
    }

    async refreshToken(providedRefreshToken: string): Promise<IRefreshResponse> {
        let userUuid: string;
        try {
            userUuid = verifyRefreshToken(providedRefreshToken).userUUID;
        } catch (err) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, tokenFailureDetails(providedRefreshToken, err));
        }

        const user = await this.userRepo.findOne({ where: { uuid: userUuid }, relations: { company: true } });
        if (!user) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "user not found", userUuid });
        }

        AuthService.assertCanSignIn(user);

        const details = { userUuid: user.uuid, role: UserRole[user.role] };
        if (!user.refreshToken) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "no refresh token in DB", ...details });
        }
        if (!refreshTokenMatches(providedRefreshToken, user.refreshToken)) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "hash comparison failed", ...details });
        }

        // Role from the freshly loaded user, not the old token's claim.
        const token = generateToken({ userUUID: user.uuid, role: user.role });

        await AuthCacheService.set(user);

        return { token };
    }

    async getAuthUser(userUuid: string): Promise<IAuthUser> {
        const user = await this.userRepo.findOne({ where: { uuid: userUuid } });
        if (!user) throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "user not found", userUuid });

        return AuthService.toAuthUser(user);
    }

    async logout(userUuid: string): Promise<void> {
        const user = await this.userRepo.findOne({ where: { uuid: userUuid }, relations: { company: true } });
        if (!user) return;

        user.refreshToken = null;
        await this.userRepo.save(user);

        // Kill the current access token immediately, not just refreshes.
        await AuthCacheService.revokeSessions(user);
    }
}
