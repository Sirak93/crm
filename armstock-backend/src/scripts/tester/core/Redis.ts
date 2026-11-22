import Redis from "ioredis";

/** Empties one Redis index - only ever a tester index, never the app's own. */
export const flushRedisIndex = async (index: string): Promise<void> => {
    const client = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(index),
    });
    try {
        await client.flushdb();
    } finally {
        await client.quit();
    }
};
