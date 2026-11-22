import type { ITestCase } from "../interfaces/ITestCase";
import type { ITestSuite } from "../interfaces/ITestSuite";

/**
 * A suite file reads as a list of cases:
 *
 *   export default (context) => defineSuite("Stock-out", (test) => {
 *       test("create returns the sent lines", async () => { ... });
 *   });
 *
 * Cases run in the order written and may build on the ones before them.
 */
export const defineSuite = (
    name: string,
    build: (test: (caseName: string, fn: ITestCase["fn"]) => void, skip: (caseName: string, fn: ITestCase["fn"]) => void) => void,
): ITestSuite => {
    const cases: ITestCase[] = [];
    build(
        (caseName, fn) => cases.push({ name: caseName, fn }),
        (caseName, fn) => cases.push({ name: caseName, fn, skip: true }),
    );
    return { name, cases };
};
