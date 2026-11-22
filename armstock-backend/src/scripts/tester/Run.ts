import { run } from "./core/Runner";
import { companySide } from "./sides/CompanySide";
import { platformSide } from "./sides/PlatformSide";
import { rateLimitsSide } from "./sides/RateLimitsSide";
import type { ITestSide } from "./interfaces/ITestSide";

/**
 *   npm test -w armstock-backend               every side
 *   npm run test:company -w armstock-backend       one side
 *   npm run test:platform -w armstock-backend
 *   npm run test:rate-limits -w armstock-backend
 */
const SIDES: ITestSide<any>[] = [companySide, platformSide, rateLimitsSide];

const only = process.argv[2];
const picked = only ? SIDES.filter((side) => side.name === only) : SIDES;

if (!picked.length) {
    process.stderr.write(`Unknown side "${only}". Sides: ${SIDES.map((s) => s.name).join(", ")}\n`);
    process.exit(1);
}

run(picked);
