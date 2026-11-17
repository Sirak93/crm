import { redisClient } from "../config/RedisConfig";

/**
 * Shared Redis access point. Methods let Redis errors propagate - each caller decides
 * whether a failure can be bypassed - except `resolve`, which falls back to the fetcher.
 */
export class RedisService {
    static async initialize(): Promise<void> {
        if (redisClient.status === "ready") return;

        if (redisClient.status === "wait" || redisClient.status === "end") {
            await redisClient.connect();
            return;
        }

        // A connection is already in flight - wait for it; a second connect() would throw.
        await new Promise<void>((resolve, reject) => {
            redisClient.once("ready", resolve);
            redisClient.once("error", reject);
        });
    }

    // Status, not PING: while Redis is down, ioredis queues commands, so a PING would hang.
    static get isReady(): boolean {
        return redisClient.status === "ready";
    }

    static async get<T>(key: string): Promise<T | null> {
        const data = await redisClient.get(key);
        return data ? (JSON.parse(data) as T) : null;
    }

    static async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    }

    /** Cache-aside: the cached value, or `fetcher()` cached for `ttlSeconds`. A dead Redis just calls `fetcher`. */
    static async resolve<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
        if (!this.isReady) return fetcher();

        try {
            const cached = await this.get<T>(key);
            if (cached !== null) return cached;
        } catch {
            return fetcher();
        }

        const value = await fetcher();

        try {
            await this.set(key, value, ttlSeconds);
        } catch {
            // Best-effort write - a failed cache write shouldn't fail the request.
        }

        return value;
    }
}
