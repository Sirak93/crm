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
            accountType: user.accountType,
            canLogIn: user.canLogIn,
            permissions: user.permissions,
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
     * Applies a change to cached snapshots at once. Updated in place, not deleted, so a logout's
     * `revokedBefore` is kept; users with no cached snapshot load the new state from the DB.
     */
    private static async patchSnapshots(userUuids: string[], patch: Partial<IAuthSnapshot>): Promise<void> {
        // While Redis is down, reads fall back to the DB anyway (and ioredis would queue these calls).
        if (!RedisService.isReady) return;

        try {
            await Promise.all(userUuids.map(async (uuid) => {
                const key = RedisKeys.auth.userSnapshot.key(uuid);
                const snapshot = await RedisService.get<IAuthSnapshot>(key);
                if (snapshot) {
                    await RedisService.set(key, { ...snapshot, ...patch } satisfies IAuthSnapshot, RedisKeys.auth.userSnapshot.ttl);
                }
            }));
        } catch (error) {
            AppLogger.warn("Could not update auth snapshots:", error);
        }
    }

    static async setCompanyStatus(companyUuid: string, companyStatus: CompanyStatus): Promise<void> {
        const users = await this.userRepo.find({ where: { companyUuid }, select: { uuid: true } });
        await this.patchSnapshots(users.map((user) => user.uuid), { companyStatus });
    }

    /** After a change of login, permissions, or status, so open sessions follow it on their next request. */
    static async setUserAccess(user: User): Promise<void> {
        await this.patchSnapshots([user.uuid], { canLogIn: user.canLogIn, permissions: user.permissions, status: user.status });
    }

    /** A role's permissions applied to its users. */
    static async setPermissions(userUuids: string[], permissions: User["permissions"]): Promise<void> {
        await this.patchSnapshots(userUuids, { permissions });
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
