import {
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    ProductStatus,
    StockOutReason,
    type IKitchenQuantity,
    type IProduct,
    type IProductCategory,
    type IRecipeDetails,
    type IStockBalance,
    type IStockOutDetails,
    type IStockShortage,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isTrue, matches } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import {
    createCategory,
    createProduct,
    createRecipe,
    createStockIn,
    createStockOut,
    findCategory,
    KILOS_UNIT,
    lineOf,
    stockInBody,
    stockOutBody,
} from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import { expectKitchen, expectStock, kitchenOf } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestUser } from "../../interfaces/ITestUser";

/**
 * K = totals issued to the kitchen − recipe needs, per product. Every product here has one name tag,
 * and the list cases search by it - other suites leave their own products in the same company.
 */
export default (context: ICompanySideContext) => defineSuite("Kitchen balance", (test) => {
    const { db, anonymous, companyA, companyB } = context;
    const storekeeper = companyA.storekeeper;
    const tag = uniqueName("Kitchen").replace(" ", "");

    let chef: ITestUser;
    let category: IProductCategory;
    let ownCategory: IProductCategory;
    // oil: the decisions.md example. salt: extras only. egg: never reaches the kitchen.
    // flour: in its own category, archived later. sugar: for the delete / edit cases.
    const products: Record<"oil" | "salt" | "egg" | "flour" | "sugar", IProduct> = {} as never;
    let soup: IRecipeDetails;
    let cake: IRecipeDetails;
    let firstOilDoc: IStockOutDetails;

    const nameOf = (key: keyof typeof products) => `${tag} ${key}`;
    const recipeRow = (recipe: { uuid: string }, persons: number) => ({ recipeUuid: recipe.uuid, persons });
    const total = (product: IProduct, quantity: number, extraQuantity = 0) => ({ productUuid: product.uuid, quantity, extraQuantity });
    const recipeBody = (recipes: unknown[], totals: unknown[], fields: Record<string, unknown> = {}) =>
        stockOutBody([], { recipes, lines: totals, ...fields });
    const path = (uuid: string) => `${PATHS.STOCK_OUTS}/${uuid}`;
    const list = async (params = "") =>
        storekeeper.api.ok<IStockBalance[]>("GET", `${PATHS.KITCHEN_BALANCE}?search=${encodeURIComponent(tag)}&pageSize=100&${params}`);
    const shortagesOf = (response: { body: { error?: { meta?: unknown } } }) => response.body.error?.meta as IStockShortage[];

    test("prepares a head chef, products with stock and two recipes", async () => {
        [chef, category, ownCategory] = await Promise.all([
            createMember(companyA, { role: DefaultRole.CHEF, permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.CHEF]], label: "kitchen-chef" }),
            findCategory(storekeeper),
            createCategory(storekeeper),
        ]);
        const make = (key: keyof typeof products, allowsDecimals: boolean, categoryUuid = category.uuid) =>
            createProduct(storekeeper, { allowsDecimals, body: { name: nameOf(key), categoryUuid } })
                .then((product) => { products[key] = product; });
        await Promise.all([make("oil", true), make("salt", true), make("egg", false), make("flour", true, ownCategory.uuid), make("sugar", true)]);
        const { oil, salt, egg, flour, sugar } = products;
        await createStockIn(storekeeper, [lineOf(oil, 100), lineOf(salt, 10), lineOf(egg, 100), lineOf(flour, 10), lineOf(sugar, 10)]);
        soup = await createRecipe(chef, [lineOf(oil, 0.15)]);
        cake = await createRecipe(chef, [lineOf(sugar, 0.1), lineOf(flour, 0.1)]);
    });

    test("a default chef sees the kitchen balance but not the store balance or movements", async () => {
        await chef.api.ok("GET", PATHS.KITCHEN_BALANCE);
        await chef.api.rejects("GET", PATHS.STOCK_BALANCE, ErrorCodes.AUTH.FORBIDDEN);
        await chef.api.rejects("GET", PATHS.STOCK_MOVEMENT, ErrorCodes.AUTH.FORBIDDEN);
    });

    test("an issue without recipes adds its totals to K", async () => {
        firstOilDoc = await createStockOut(storekeeper, [lineOf(products.oil, 0.9)]);
        await expectKitchen(db, products.oil.uuid, 0.9);
    });

    test("other reasons never touch K", async () => {
        for (const reason of [StockOutReason.DAMAGED, StockOutReason.EXPIRED]) {
            await createStockOut(storekeeper, [lineOf(products.oil, 1)], { reason, department: null });
        }
        await createStockOut(storekeeper, [lineOf(products.oil, 1)], { reason: StockOutReason.OTHER, department: null, note: "test" });
        await expectKitchen(db, products.oil.uuid, 0.9);
        await expectStock(db, products.oil.uuid, 96.1);
    });

    test("K 0.9 l, recipes need 1.5 l, a 5 l bottle given → K 4.4 l; extras stay in K", async () => {
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, recipeBody(
            [recipeRow(soup, 10)],
            [total(products.oil, 5, 3.5), total(products.salt, 2, 2)],
        ));
        await expectKitchen(db, products.oil.uuid, 4.4);
        await expectKitchen(db, products.salt.uuid, 2);
        await expectStock(db, products.oil.uuid, 91.1);
    });

    test("K + total below the recipe needs is refused with what the kitchen had; nothing is saved", async () => {
        const before = await db.query<{ count: string }>("SELECT COUNT(*) FROM stock_outs WHERE company_uuid = $1", [companyA.uuid]);
        // 100 persons need 15; K 4.4 + 10 = 14.4.
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH, recipeBody(
            [recipeRow(soup, 100)],
            [total(products.oil, 10)],
        ));
        matches(shortagesOf(response), [{ name: nameOf("oil"), measureUnit: KILOS_UNIT, available: 14.4 }]);
        const after = await db.query<{ count: string }>("SELECT COUNT(*) FROM stock_outs WHERE company_uuid = $1", [companyA.uuid]);
        equals(after[0].count, before[0].count, "documents");
        await expectKitchen(db, products.oil.uuid, 4.4);
        await expectStock(db, products.oil.uuid, 91.1);
    });

    test("the kitchen may use what it has: total 0 while K covers the needs", async () => {
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, recipeBody([recipeRow(soup, 10)], [total(products.oil, 0)]));
        await expectKitchen(db, products.oil.uuid, 2.9);
        await expectStock(db, products.oil.uuid, 91.1);
    });

    test("the store check still comes first", async () => {
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH, recipeBody(
            [recipeRow(soup, 10)],
            [total(products.oil, 1000)],
        ));
    });

    // sugar: the first doc gives 1, the second uses it all through the cake recipe.
    let sugarIn: IStockOutDetails;
    let sugarUsed: IStockOutDetails;

    test("prepares a doc whose sugar a later doc used", async () => {
        sugarIn = await createStockOut(storekeeper, [lineOf(products.sugar, 1)]);
        const { data } = await storekeeper.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS, recipeBody(
            [recipeRow(cake, 10)],
            [total(products.sugar, 0), total(products.flour, 1)],
        ));
        sugarUsed = data;
        await expectKitchen(db, products.sugar.uuid, 0);
        await expectKitchen(db, products.flour.uuid, 0);
    });

    test("deleting a doc whose part the kitchen already used is refused, showing K as it is", async () => {
        const response = await storekeeper.api.rejects("DELETE", path(sugarIn.uuid), ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH);
        matches(shortagesOf(response), [{ name: nameOf("sugar"), available: 0 }]);
        await storekeeper.api.ok("GET", path(sugarIn.uuid));
        await expectKitchen(db, products.sugar.uuid, 0);
    });

    test("editing it below what was used, or to a reason that is not an issue, is refused", async () => {
        await storekeeper.api.rejects("PUT", path(sugarIn.uuid), ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH, stockOutBody([lineOf(products.sugar, 0.5)]));
        await storekeeper.api.rejects("PUT", path(sugarIn.uuid), ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH,
            stockOutBody([lineOf(products.sugar, 1)], { reason: StockOutReason.DAMAGED, department: null }));
        // Replacing the product takes sugar out of the kitchen too.
        await storekeeper.api.rejects("PUT", path(sugarIn.uuid), ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH, stockOutBody([lineOf(products.salt, 1)]));
        await expectKitchen(db, products.sugar.uuid, 0);
        await storekeeper.api.ok("PUT", path(sugarIn.uuid), stockOutBody([lineOf(products.sugar, 1.5)]));
        await expectKitchen(db, products.sugar.uuid, 0.5);
    });

    test("editing a recipe doc counts its own needs once: more persons than K covers is refused, the same persons fine", async () => {
        const body = (persons: number) => recipeBody([recipeRow(cake, persons)], [total(products.sugar, 0), total(products.flour, 1)]);
        // K without this doc + its totals: sugar 1.5, flour 1. 20 persons need 2 of each.
        const response = await storekeeper.api.rejects("PUT", path(sugarUsed.uuid), ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH, body(20));
        matches(shortagesOf(response), [{ name: nameOf("flour"), available: 1 }, { name: nameOf("sugar"), available: 1.5 }]);
        await storekeeper.api.ok("PUT", path(sugarUsed.uuid), body(10));
        await expectKitchen(db, products.sugar.uuid, 0.5);
    });

    test("deleting in the right order works: the doc that used K, then the one that gave it", async () => {
        await storekeeper.api.ok("DELETE", path(sugarUsed.uuid));
        await expectKitchen(db, products.sugar.uuid, 1.5);
        await expectKitchen(db, products.flour.uuid, 0);
        await storekeeper.api.ok("DELETE", path(sugarIn.uuid));
        await expectKitchen(db, products.sugar.uuid, 0);
        await expectStock(db, products.sugar.uuid, 10);
    });

    test("a doc with no kitchen lines is deleted without a K check", async () => {
        const damaged = await createStockOut(storekeeper, [lineOf(products.sugar, 1)], { reason: StockOutReason.DAMAGED, department: null });
        await storekeeper.api.ok("DELETE", path(damaged.uuid));
        await expectKitchen(db, products.sugar.uuid, 0);
    });

    test("stock-ins never touch K", async () => {
        const before = await kitchenOf(db, products.oil.uuid);
        const { data: doc } = await storekeeper.api.ok("POST", PATHS.STOCK_INS, stockInBody([lineOf(products.oil, 5)]));
        await expectKitchen(db, products.oil.uuid, before, "after a stock-in");
        await storekeeper.api.ok("PUT", `${PATHS.STOCK_INS}/${doc.uuid}`, stockInBody([lineOf(products.oil, 2)]));
        await storekeeper.api.ok("DELETE", `${PATHS.STOCK_INS}/${doc.uuid}`);
        await expectKitchen(db, products.oil.uuid, before, "after its edit and delete");
    });

    test("the page lists products with K above 0, sorted by name, an archived one too; numbers match the database", async () => {
        await createStockOut(storekeeper, [lineOf(products.flour, 0.25)]);
        await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${products.flour.uuid}/status`, { status: ProductStatus.ARCHIVED });

        const { data, meta } = await list();
        matches(data.map((item) => item.name), [nameOf("flour"), nameOf("oil"), nameOf("salt")]);
        equals(meta.total, 3, "total");
        matches(data[0], { uuid: products.flour.uuid, status: ProductStatus.ARCHIVED, categoryName: ownCategory.name, measureUnit: KILOS_UNIT, quantity: 0.25 });
        for (const item of data) equals(item.quantity, await kitchenOf(db, item.uuid), `${item.name} quantity`);
    });

    test("filter by category, paging and a bad query", async () => {
        matches((await list(`categoryUuid=${ownCategory.uuid}`)).data.map((item) => item.name), [nameOf("flour")]);
        const { data, meta } = await storekeeper.api.ok<IStockBalance[]>("GET",
            `${PATHS.KITCHEN_BALANCE}?search=${encodeURIComponent(tag)}&page=2&pageSize=2`);
        matches(data.map((item) => item.name), [nameOf("salt")]);
        matches(meta, { page: 2, pageSize: 2, total: 3, totalPages: 2 });
        await storekeeper.api.rejectsField("GET", `${PATHS.KITCHEN_BALANCE}?pageSize=101`, "pageSize");
        await storekeeper.api.rejectsField("GET", `${PATHS.KITCHEN_BALANCE}?categoryUuid=nope`, "categoryUuid");
    });

    test("the form's kitchen amounts: products with K above 0, for any member", async () => {
        const { data } = await companyA.staff.api.ok<IKitchenQuantity[]>("GET", `${PATHS.OPTIONS}/kitchen-balance`);
        const byProduct = new Map(data.map((item) => [item.productUuid, item.quantity]));
        equals(byProduct.get(products.oil.uuid), await kitchenOf(db, products.oil.uuid), "oil");
        equals(byProduct.get(products.salt.uuid), 2, "salt");
        isTrue(!byProduct.has(products.egg.uuid) && !byProduct.has(products.sugar.uuid), "products at 0 left out");
        isTrue(data.every((item) => item.quantity > 0), "only above 0");
    });

    test("Accountant can see the page; Staff, no token and the Platform Owner can't", async () => {
        await companyA.accountant.api.ok("GET", PATHS.KITCHEN_BALANCE);
        for (const user of [companyA.staff, context.platformOwner]) {
            await user.api.rejects("GET", PATHS.KITCHEN_BALANCE, ErrorCodes.AUTH.FORBIDDEN);
        }
        await anonymous.rejects("GET", PATHS.KITCHEN_BALANCE, ErrorCodes.AUTH.UNAUTHORIZED);
    });

    test("the other company never sees or counts this company's kitchen", async () => {
        const ownerOfB = companyB.owner;
        matches((await ownerOfB.api.ok<IStockBalance[]>("GET", `${PATHS.KITCHEN_BALANCE}?search=${encodeURIComponent(tag)}`)).data, []);
        const { data } = await ownerOfB.api.ok<IKitchenQuantity[]>("GET", `${PATHS.OPTIONS}/kitchen-balance`);
        const ours = new Set(Object.values(products).map((product) => product.uuid));
        isTrue(data.every((item) => !ours.has(item.productUuid)), "none of this company's products");
    });
});
