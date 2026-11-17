/** Added by the client (RedisConfig `keyPrefix`) to every key - never write it in a key. */
export const REDIS_KEY_PREFIX = "armstock:";

// All `ttl` values are in SECONDS.
export const RedisKeys = {
    auth: {
        userSnapshot: {
            key: (uuid: string) => `auth:snapshot:${uuid}`,
            ttl: 60 * 15, // upper bound on staleness if an invalidation is missed
        },
    },
};
