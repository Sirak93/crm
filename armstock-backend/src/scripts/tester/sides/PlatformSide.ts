import healthSuite from "../suites/platform/HealthSuite";
import platformCompaniesSuite from "../suites/platform/PlatformCompaniesSuite";
import platformLogsSuite from "../suites/platform/PlatformLogsSuite";
import type { ITestSide } from "../interfaces/ITestSide";

// A threshold no tester request reaches, so "slow" is always false here.
const NEVER_SLOW_MS = "600000";

/** The Platform Owner's tools. Suites make the companies they need. */
export const platformSide: ITestSide = {
    name: "platform",
    // Request logging on whatever `.env` says, so the logs suite always has rows to read.
    env: { API_DB_LOG_ENABLED: "true", SLOW_REQUEST_THRESHOLD_MS: NEVER_SLOW_MS },
    setup: async (context) => context,
    suites: [platformCompaniesSuite, platformLogsSuite, healthSuite],
};
