import { createCompany } from "../shared/Companies";
import stockOutSuite from "../suites/company/StockOutSuite";
import type { ICompanySideContext } from "../interfaces/ICompanySideContext";
import type { ITestSide } from "../interfaces/ITestSide";

/** Company users' side. Two companies live for the whole run, so cross-company access is always checked. */
export const companySide: ITestSide<ICompanySideContext> = {
    name: "company",
    setup: async (context) => {
        const [companyA, companyB] = await Promise.all([createCompany(context, "A"), createCompany(context, "B")]);
        return { ...context, companyA, companyB };
    },
    suites: [stockOutSuite],
};
