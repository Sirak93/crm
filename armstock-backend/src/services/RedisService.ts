import { redisClient } from "../config/RedisConfig";

/** Shared Redis access point. Cache helpers are added in step 12. */
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
}
