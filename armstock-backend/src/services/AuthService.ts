import bcrypt from "bcrypt";
import { CompanyStatus, ErrorCodes, UserStatus, type IAuthUser, type ILoginResponse, type IRefreshResponse } from "armstock-shared";
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
        // Only users with a login get here, and those always have an email.
        if (!user.email) throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "user has no email", userUuid: user.uuid });
        return {
            uuid: user.uuid,
            email: user.email,
            accountType: user.accountType,
            permissions: user.permissions,
            status: user.status,
            firstName: user.firstName,
            lastName: user.lastName,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        };
    }

    /** `user.company` must be loaded. */
    private static assertCanSignIn(user: User): void {
        if (user.status !== UserStatus.ACTIVE) throw new AppError(ErrorCodes.USER.BLOCKED);
        if (user.company && user.company.status !== CompanyStatus.ACTIVE) throw new AppError(ErrorCodes.COMPANY.BLOCKED);
    }

    async login(email: string, password: string): Promise<ILoginResponse> {
        const user = await this.userRepo.findOne({ where: { email }, relations: { company: true } });
        // A user without login has no password either.
        if (!user?.password || !user.canLogIn) throw new AppError(ErrorCodes.AUTH.INVALID_CREDENTIALS);

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new AppError(ErrorCodes.AUTH.INVALID_CREDENTIALS);

        AuthService.assertCanSignIn(user);

        const payload = { userUUID: user.uuid };
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

        const details = { userUuid: user.uuid };
        if (!user.refreshToken) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "no refresh token in DB", ...details });
        }
        if (!refreshTokenMatches(providedRefreshToken, user.refreshToken)) {
            throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED, undefined, undefined, { reason: "hash comparison failed", ...details });
        }

        const token = generateToken({ userUUID: user.uuid });

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
