import rateLimit from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { ErrorCodes } from "armstock-shared";
import { redisClient } from "../config/RedisConfig";
import { RateLimits, type RateLimitPreset } from "../constants/RateLimits";
import { AppError } from "../utils/AppError";

/**
 * Rate-limit middleware for a named preset, stored in Redis so counts survive a restart.
 * Errors go through ErrorHandler like every other app error.
 */
export const buildRateLimiter = (preset: RateLimitPreset) => {
    const { windowMs, max, message } = RateLimits[preset];

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        // Redis down: let the request through instead of failing every login.
        passOnStoreError: true,
        store: new RedisStore({
            prefix: `rl:${preset.toLowerCase()}:`,
            sendCommand: (...args: string[]) =>
                redisClient.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
        }),
        handler: (_req, _res, next) => next(new AppError(ErrorCodes.RATE_LIMIT.TOO_MANY_REQUESTS, undefined, message)),
    });
};
