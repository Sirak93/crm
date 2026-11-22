import { NodeEnv } from "../../../constants/NodeEnv";
import { flushRedisIndex } from "../core/Redis";
import loginLimitSuite from "../suites/rate-limits/LoginLimitSuite";
import type { ITestSide } from "../interfaces/ITestSide";

// Its own index: the only side where the limit counters matter, so a count left over from an
// earlier run must never leak in.
const REDIS_DB = process.env.TESTER_RATE_LIMITS_REDIS_DB || "14";

/** The real limits: every other side runs with NODE_ENV=test and a very high ceiling. */
export const rateLimitsSide: ITestSide = {
    name: "rate-limits",
    env: { NODE_ENV: NodeEnv.DEVELOPMENT, REDIS_DB },
    beforeStart: () => flushRedisIndex(REDIS_DB),
    setup: async (context) => context,
    suites: [loginLimitSuite],
};
