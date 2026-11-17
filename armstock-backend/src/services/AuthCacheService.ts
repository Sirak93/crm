import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { RedisService } from "./RedisService";
import { RedisKeys } from "../constants/RedisKeys";
import { IAuthSnapshot } from "../interfaces/IAuthSnapshot";

/**
 * Redis-backed per-user auth snapshot, read by AuthMiddleware on every authenticated
 * request instead of the DB. A cache miss or a dead Redis falls back to a DB read.
 */
export class AuthCacheService {
    private static get userRepo() {
        return AppDataSource.getRepository(User);
    }

    private static toSnapshot(user: User): IAuthSnapshot {
        return { role: user.role, isActive: user.isActive };
    }

    private static async loadFromDb(uuid: string): Promise<IAuthSnapshot | null> {
        const user = await this.userRepo.findOne({ where: { uuid } });
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
