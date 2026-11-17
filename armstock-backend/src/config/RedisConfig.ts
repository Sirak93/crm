import Redis from "ioredis";
import { REDIS_KEY_PREFIX } from "../constants/RedisKeys";

export const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    keyPrefix: REDIS_KEY_PREFIX,
    // Connects only when RedisService.initialize() calls connect() - like AppDataSource.
    lazyConnect: true,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
});
