import type { ITestContext } from "./ITestContext";
import type { ITestSuite } from "./ITestSuite";

/** One side of the product: its own database, backend, fixture and suites. */
export interface ITestSide<T extends ITestContext = ITestContext> {
    /** Used in the database name and on the command line. */
    name: string;
    /** Extra env for this side's backend. */
    env?: Record<string, string>;
    setup: (context: ITestContext) => Promise<T>;
    suites: ((context: T) => ITestSuite)[];
}
