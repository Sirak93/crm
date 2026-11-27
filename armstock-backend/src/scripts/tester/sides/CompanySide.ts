import { createCompany } from "../shared/Companies";
import stockInSuite from "../suites/company/StockInSuite";
import stockOutSuite from "../suites/company/StockOutSuite";
import stockConcurrencySuite from "../suites/company/StockConcurrencySuite";
import supplierReturnSuite from "../suites/company/SupplierReturnSuite";
import stockInAfterReturnsSuite from "../suites/company/StockInAfterReturnsSuite";
import stockBalanceSuite from "../suites/company/StockBalanceSuite";
import kitchenBalanceSuite from "../suites/company/KitchenBalanceSuite";
import stockMovementSuite from "../suites/company/StockMovementSuite";
import stockListExportSuite from "../suites/company/StockListExportSuite";
import companyIsolationSuite from "../suites/company/CompanyIsolationSuite";
import permissionsSuite from "../suites/company/PermissionsSuite";
import authSuite from "../suites/company/AuthSuite";
import companyUsersSuite from "../suites/company/CompanyUsersSuite";
import rolesSuite from "../suites/company/RolesSuite";
import productsSuite from "../suites/company/ProductsSuite";
import suppliersSuite from "../suites/company/SuppliersSuite";
import productCategoriesSuite from "../suites/company/ProductCategoriesSuite";
import optionsSuite from "../suites/company/OptionsSuite";
import recipeTablesSuite from "../suites/company/RecipeTablesSuite";
import recipesSuite from "../suites/company/RecipesSuite";
import uniqueNamesSuite from "../suites/company/UniqueNamesSuite";
import type { ICompanySideContext } from "../interfaces/ICompanySideContext";
import type { ITestSide } from "../interfaces/ITestSide";

/** Company users' side. Two companies live for the whole run, so cross-company access is always checked. */
export const companySide: ITestSide<ICompanySideContext> = {
    name: "company",
    setup: async (context) => {
        const [companyA, companyB] = await Promise.all([createCompany(context, "A"), createCompany(context, "B")]);
        return { ...context, companyA, companyB };
    },
    suites: [
        stockInSuite,
        stockOutSuite,
        stockConcurrencySuite,
        supplierReturnSuite,
        stockInAfterReturnsSuite,
        stockBalanceSuite,
        kitchenBalanceSuite,
        stockMovementSuite,
        stockListExportSuite,
        companyIsolationSuite,
        permissionsSuite,
        authSuite,
        companyUsersSuite,
        rolesSuite,
        productsSuite,
        suppliersSuite,
        productCategoriesSuite,
        optionsSuite,
        recipeTablesSuite,
        recipesSuite,
        uniqueNamesSuite,
    ],
};
