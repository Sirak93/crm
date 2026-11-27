import { ErrorCodes, ProductStatus, type IProduct, type IProductCategory, type IStockMovement } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, matches } from "../../core/Assert";
import { createCategory, createProduct, createRecipe, createStockIn, createStockOut, lineOf, stockOutBody } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import { stockOf } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

type Key = "apple" | "bean" | "corn" | "date" | "egg" | "fig";
type Numbers = [initial: number, incoming: number, outgoing: number, final: number];

/**
 * Documents dated Feb - May 2021, so ranges before, inside and after them are fixed. Every product
 * has one name tag, and the list cases search by it - other suites leave products in the same company.
 */
export default (context: ICompanySideContext) => defineSuite("Stock movement", (test) => {
    const { anonymous, db, companyA, companyB } = context;
    const storekeeper = companyA.storekeeper;
    const tag = uniqueName("Movement").replace(" ", "");

    // apple: moves every month. bean: stock from Feb only, own category. corn: never moved.
    // date: in and out in March, 0 left. egg: in in March, archived later. fig: a by-recipe line with total 0 in April.
    const products: Record<Key, IProduct> = {} as never;
    let ownCategory: IProductCategory;

    const nameOf = (key: Key) => `${tag} ${key}`;
    const day = (month: number, date: number) => `2021-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}T12:00:00.000Z`;
    const from = (month: number) => `2021-${String(month).padStart(2, "0")}-01T00:00:00.000Z`;
    const to = (month: number) => new Date(Date.UTC(2021, month, 1) - 1).toISOString();
    const list = async (params: Record<string, string | undefined>) => {
        const query = new URLSearchParams({ search: tag, pageSize: "100" });
        for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, value);
        return storekeeper.api.ok<IStockMovement[]>("GET", `${PATHS.STOCK_MOVEMENT}?${query}`);
    };
    const numbersOf = (item: IStockMovement): Numbers => [item.initial, item.incoming, item.outgoing, item.final];
    /** The rows by name, each with its four numbers. */
    const expectRows = async (params: Record<string, string | undefined>, expected: Partial<Record<Key, Numbers>>) => {
        const { data, meta } = await list(params);
        const keys = Object.keys(expected) as Key[];
        matches(data.map((item) => item.name), keys.map(nameOf), "products");
        equals(meta.total, keys.length, "total");
        data.forEach((item, i) => matches(numbersOf(item), expected[keys[i]]!, `${item.name} numbers`));
        return data;
    };

    test("prepares products with documents from February to May 2021", async () => {
        ownCategory = await createCategory(storekeeper);
        const keys: Key[] = ["apple", "bean", "corn", "date", "egg", "fig"];
        await Promise.all(keys.map((key) => createProduct(storekeeper, {
            body: { name: nameOf(key), ...(key === "bean" ? { categoryUuid: ownCategory.uuid } : {}) },
        }).then((product) => { products[key] = product; })));
        const { apple, bean, date, egg, fig } = products;

        await createStockIn(storekeeper, [lineOf(bean, 20), lineOf(fig, 10)], { date: day(2, 1) });
        await createStockOut(storekeeper, [lineOf(fig, 5)], { date: day(3, 1) });
        await createStockIn(storekeeper, [lineOf(apple, 100)], { date: day(3, 5) });
        await createStockIn(storekeeper, [lineOf(date, 5)], { date: day(3, 10) });
        await createStockOut(storekeeper, [lineOf(date, 5)], { date: day(3, 11) });
        await createStockIn(storekeeper, [lineOf(egg, 4)], { date: day(3, 12) });
        await createStockOut(storekeeper, [lineOf(apple, 30)], { date: day(3, 20) });
        await createStockIn(storekeeper, [lineOf(apple, 10)], { date: day(4, 10) });
        // The kitchen has the 5 figs from March, so the recipe needs no new ones.
        const recipe = await createRecipe(companyA.owner, [lineOf(fig, 1)]);
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, stockOutBody([], {
            date: day(4, 15),
            recipes: [{ recipeUuid: recipe.uuid, persons: 1 }],
            lines: [{ productUuid: fig.uuid, quantity: 0, extraQuantity: 0 }],
        }));
        await createStockOut(storekeeper, [lineOf(apple, 5)], { date: day(5, 2) });
        await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${egg.uuid}/status`, { status: ProductStatus.ARCHIVED });
    });

    test("a range inside the documents: only products that moved, sorted by name, an archived one too", async () => {
        const data = await expectRows({ dateFrom: from(3), dateTo: to(3) }, {
            apple: [0, 100, 30, 70],
            date: [0, 5, 5, 0],
            egg: [0, 4, 0, 4],
            fig: [10, 0, 5, 5],
        });
        matches(data[2], { uuid: products.egg.uuid, status: ProductStatus.ARCHIVED, measureUnit: products.egg.measureUnit });
    });

    test("\"show products without movement\" adds products with stock, never ones at 0 or never moved", async () => {
        await expectRows({ dateFrom: from(3), dateTo: to(3), withoutMovement: "true" }, {
            apple: [0, 100, 30, 70],
            bean: [20, 0, 0, 20],
            date: [0, 5, 5, 0],
            egg: [0, 4, 0, 4],
            fig: [10, 0, 5, 5],
        });
    });

    test("a stock-out line with total 0 counts as movement", async () => {
        await expectRows({ dateFrom: from(4), dateTo: to(4) }, {
            apple: [70, 10, 0, 80],
            fig: [5, 0, 0, 5],
        });
    });

    test("a range before every document is empty, with the checkbox too", async () => {
        await expectRows({ dateFrom: from(1), dateTo: to(1) }, {});
        await expectRows({ dateFrom: from(1), dateTo: to(1), withoutMovement: "true" }, {});
    });

    test("a range after every document: nothing moved; with the checkbox the stock stays as it was", async () => {
        await expectRows({ dateFrom: from(6), dateTo: to(6) }, {});
        await expectRows({ dateFrom: from(6), dateTo: to(6), withoutMovement: "true" }, {
            apple: [75, 0, 0, 75],
            bean: [20, 0, 0, 20],
            egg: [4, 0, 0, 4],
            fig: [5, 0, 0, 5],
        });
    });

    test("no \"from\" starts at the first document (initial 0); later lines are left out", async () => {
        await expectRows({ dateTo: to(3) }, {
            apple: [0, 100, 30, 70],
            bean: [0, 20, 0, 20],
            date: [0, 5, 5, 0],
            egg: [0, 4, 0, 4],
            fig: [0, 10, 5, 5],
        });
    });

    test("no \"to\" runs up to now: final is the current stock", async () => {
        const data = await expectRows({ dateFrom: from(4), withoutMovement: "true" }, {
            apple: [70, 10, 5, 75],
            bean: [20, 0, 0, 20],
            egg: [4, 0, 0, 4],
            fig: [5, 0, 0, 5],
        });
        for (const item of data) equals(item.final, await stockOf(db, item.uuid), `${item.name} final`);
    });

    test("no range at all: everything ever moved", async () => {
        await expectRows({}, {
            apple: [0, 110, 35, 75],
            bean: [0, 20, 0, 20],
            date: [0, 5, 5, 0],
            egg: [0, 4, 0, 4],
            fig: [0, 10, 5, 5],
        });
    });

    test("filter by category, paging and a bad query", async () => {
        await expectRows({ categoryUuid: ownCategory.uuid, withoutMovement: "true", dateFrom: from(4) }, { bean: [20, 0, 0, 20] });
        const { data, meta } = await storekeeper.api.ok<IStockMovement[]>("GET",
            `${PATHS.STOCK_MOVEMENT}?search=${encodeURIComponent(tag)}&page=2&pageSize=2`);
        matches(data.map((item) => item.name), [nameOf("date"), nameOf("egg")]);
        matches(meta, { page: 2, pageSize: 2, total: 5, totalPages: 3 });
        for (const [query, field] of [
            ["dateFrom=nope", "dateFrom"],
            ["dateTo=2021-01-01", "dateTo"],
            ["withoutMovement=maybe", "withoutMovement"],
            ["categoryUuid=nope", "categoryUuid"],
            ["pageSize=101", "pageSize"],
        ]) {
            await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_MOVEMENT}?${query}`, field);
        }
    });

    test("Accountant can see the page; Staff, no token and the Platform Owner can't", async () => {
        await companyA.accountant.api.ok("GET", PATHS.STOCK_MOVEMENT);
        for (const user of [companyA.staff, context.platformOwner]) {
            await user.api.rejects("GET", PATHS.STOCK_MOVEMENT, ErrorCodes.AUTH.FORBIDDEN);
        }
        await anonymous.rejects("GET", PATHS.STOCK_MOVEMENT, ErrorCodes.AUTH.UNAUTHORIZED);
    });

    test("the other company's documents are never counted, and it never sees these products", async () => {
        const theirs = await createProduct(companyB.owner, { body: { name: nameOf("apple") } });
        await createStockIn(companyB.owner, [lineOf(theirs, 50)], { date: day(3, 7) });
        await expectRows({ dateFrom: from(3), dateTo: to(3) }, {
            apple: [0, 100, 30, 70],
            date: [0, 5, 5, 0],
            egg: [0, 4, 0, 4],
            fig: [10, 0, 5, 5],
        });
        const { data } = await companyB.owner.api.ok<IStockMovement[]>("GET",
            `${PATHS.STOCK_MOVEMENT}?search=${encodeURIComponent(tag)}&withoutMovement=true`);
        matches(data.map((item) => item.uuid), [theirs.uuid]);
    });
});
