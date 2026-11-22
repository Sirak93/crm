import { run } from "./core/Runner";
import { companySide } from "./sides/CompanySide";
import type { ITestSide } from "./interfaces/ITestSide";

/**
 *   npm test -w armstock-backend               every side
 *   npm run test:company -w armstock-backend   one side
 */
const SIDES: ITestSide<any>[] = [companySide];

const only = process.argv[2];
const picked = only ? SIDES.filter((side) => side.name === only) : SIDES;

if (!picked.length) {
    process.stderr.write(`Unknown side "${only}". Sides: ${SIDES.map((s) => s.name).join(", ")}\n`);
    process.exit(1);
}

run(picked);
