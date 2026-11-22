import { type IHealthStatus } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { hasExactKeys, matches } from "../../core/Assert";
import { PATHS } from "../../shared/Paths";
import type { ITestContext } from "../../interfaces/ITestContext";

export default (context: ITestContext) => defineSuite("Health", (test) => {
    test("answers without a token: database and Redis are up", async () => {
        const { data } = await context.anonymous.ok<IHealthStatus>("GET", PATHS.HEALTH);
        hasExactKeys(data, ["database", "redis"]);
        matches(data, { database: true, redis: true });
    });
});
