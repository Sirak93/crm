import type { ITestCompany } from "./ITestCompany";
import type { ITestContext } from "./ITestContext";

/** Two companies, so every access check has a real "other company" to be refused against. */
export interface ICompanySideContext extends ITestContext {
    companyA: ITestCompany;
    companyB: ITestCompany;
}
