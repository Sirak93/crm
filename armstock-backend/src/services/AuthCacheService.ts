import { CompanyStatus } from "armstock-shared";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { RedisService } from "./RedisService";
import { RedisKeys } from "../constants/RedisKeys";
import { IAuthSnapshot } from "../interfaces/IAuthSnapshot";
import { AppLogger } from "../utils/AppLogger";

/**
 * Redis-backed per-user auth snapshot, read by AuthMiddleware on every authenticated
 * request instead of the DB. A cache miss or a dead Redis falls back to a DB read.
 */
export class AuthCacheService {
    private static get userRepo() {
        return AppDataSource.getRepository(User);
    }

    /** `user.company` must be loaded. */
    private static toSnapshot(user: User): IAuthSnapshot {
        return {
            role: user.role,
            status: user.status,
            companyUuid: user.companyUuid,
            companyStatus: user.company?.status ?? null,
        };
    }

    private static async loadFromDb(uuid: string): Promise<IAuthSnapshot | null> {
        const user = await this.userRepo.findOne({ where: { uuid }, relations: { company: true } });
        return user ? this.toSnapshot(user) : null;
    }

    static async getSnapshot(uuid: string): Promise<IAuthSnapshot | null> {
        return RedisService.resolve(
            RedisKeys.auth.userSnapshot.key(uuid),
            RedisKeys.auth.userSnapshot.ttl,
            () => this.loadFromDb(uuid),
        );
    }

    /** A fresh snapshot (no `revokedBefore`) - right after login/refresh. */
    static async set(user: User): Promise<void> {
        try {
            await RedisService.set(
                RedisKeys.auth.userSnapshot.key(user.uuid),
                this.toSnapshot(user),
                RedisKeys.auth.userSnapshot.ttl,
            );
        } catch {
            // Best-effort - the next request rebuilds it from the DB.
        }
    }

    /**
     * Applies a company status change to its users' cached snapshots at once. Updated in place, not
     * deleted, so a logout's `revokedBefore` is kept.
     */
    static async setCompanyStatus(companyUuid: string, companyStatus: CompanyStatus): Promise<void> {
        // While Redis is down, reads fall back to the DB anyway (and ioredis would queue these calls).
        if (!RedisService.isReady) return;

        const users = await this.userRepo.find({ where: { companyUuid }, select: { uuid: true } });

        try {
            await Promise.all(users.map(async (user) => {
                const key = RedisKeys.auth.userSnapshot.key(user.uuid);
                const snapshot = await RedisService.get<IAuthSnapshot>(key);
                if (snapshot) {
                    await RedisService.set(key, { ...snapshot, companyStatus } satisfies IAuthSnapshot, RedisKeys.auth.userSnapshot.ttl);
                }
            }));
        } catch (error) {
            AppLogger.warn(`Could not update auth snapshots of company ${companyUuid}:`, error);
        }
    }

    /** Rejects every access token issued before now; a later login overwrites it. */
    static async revokeSessions(user: User): Promise<void> {
        try {
            await RedisService.set(
                RedisKeys.auth.userSnapshot.key(user.uuid),
                { ...this.toSnapshot(user), revokedBefore: Date.now() } satisfies IAuthSnapshot,
                RedisKeys.auth.userSnapshot.ttl,
            );
        } catch {
            // Best-effort - the token still expires within JWT_EXPIRES_IN.
        }
    }
}
