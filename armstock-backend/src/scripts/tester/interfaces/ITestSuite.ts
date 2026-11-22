import type { ITestCase } from "./ITestCase";

export interface ITestSuite {
    name: string;
    cases: ITestCase[];
}
