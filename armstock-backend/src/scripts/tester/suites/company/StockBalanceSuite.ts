import { ErrorCodes, ProductStatus, StockInReason, StockOutReason, type IProduct, type IProductCategory, type IStockBalance, type IStockBalanceSummary } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isNull, matches } from "../../core/Assert";
import { createCategory, createProduct, createStockIn, createStockOut, findCategory, findUnit } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import { stockOf } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

/**
 * Every product here has one name tag, and the cases search by it - other suites leave
 * their own products in the same company.
 */
export default (context: ICompanySideContext) => defineSuite("Stock balance", (test) => {
    const { db, anonymous, companyA, companyB } = context;
    const storekeeper = companyA.storekeeper;
    const tag = uniqueName("Balance").replace(" ", "");
    const code = `C${tag}`;

    let category: IProductCategory;
    let ownCategory: IProductCategory;
    let piecesUnit: string;
    let kilosUnit: string;
    // A: bought twice at different prices, partly used. B: used up. C: never came in.
    // D: archived with stock. E: archived at 0. F: in its own category. G: price rounds.
    const products: Record<"A" | "B" | "C" | "D" | "E" | "F" | "G", IProduct> = {} as never;

    const list = async (params = "") =>
        storekeeper.api.ok<IStockBalance[]>("GET", `${PATHS.STOCK_BALANCE}?search=${encodeURIComponent(tag)}&pageSize=100&${params}`);
    const summary = async (params = "") =>
        (await storekeeper.api.ok<IStockBalanceSummary>("GET", `${PATHS.STOCK_BALANCE}/summary?search=${encodeURIComponent(tag)}&${params}`)).data;
    const names = (items: IStockBalance[]) => items.map((item) => item.name);
    const nameOf = (key: keyof typeof products) => `${tag} ${key}`;

    test("prepares products with stock-ins and stock-outs", async () => {
        [category, ownCategory, piecesUnit, kilosUnit] = await Promise.all([
            findCategory(storekeeper),
            createCategory(storekeeper),
            findUnit(storekeeper, false).then((u) => u.shortName),
            findUnit(storekeeper, true).then((u) => u.shortName),
        ]);
        const make = (key: keyof typeof products, allowsDecimals = false, body: Record<string, unknown> = {}) =>
            createProduct(storekeeper, { allowsDecimals, body: { name: nameOf(key), categoryUuid: category.uuid, ...body } })
                .then((product) => { products[key] = product; });
        await Promise.all([
            make("A", false, { code }),
            make("B", true),
            make("C"),
            make("D"),
            make("E"),
            make("F", false, { categoryUuid: ownCategory.uuid }),
            make("G"),
        ]);
        const { A, B, D, E, F, G } = products;

        await createStockIn(storekeeper, [{ productUuid: A.uuid, quantity: 10, price: 2 }, { productUuid: B.uuid, quantity: 2.5, price: 10.4 }]);
        await createStockIn(storekeeper, [{ productUuid: A.uuid, quantity: 10, price: 4 }, { productUuid: D.uuid, quantity: 3, price: 5 }]);
        await createStockIn(storekeeper, [{ productUuid: E.uuid, quantity: 1 }, { productUuid: F.uuid, quantity: 1, price: 7 }]);
        // 3 × 3.33 = 9.99, but the invoice says 10.00 - the average must come from the total.
        await storekeeper.api.ok("POST", PATHS.STOCK_INS, {
            reason: StockInReason.INITIAL_STOCK,
            date: new Date().toISOString(),
            lines: [{ productUuid: G.uuid, quantity: 3, price: 3.33, total: 10 }],
        });
        await createStockOut(storekeeper, [{ productUuid: A.uuid, quantity: 5 }, { productUuid: B.uuid, quantity: 2.5 }, { productUuid: E.uuid, quantity: 1 }],
            { reason: StockOutReason.DAMAGED, department: null });
        for (const archived of [D, E]) {
            await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${archived.uuid}/status`, { status: ProductStatus.ARCHIVED });
        }
    });

    test("by default only products in stock are listed, sorted by name", async () => {
        const { data, meta } = await list();
        matches(names(data), [nameOf("A"), nameOf("D"), nameOf("F"), nameOf("G")]);
        equals(meta.total, 4, "total");
    });

    test("quantity, average price and value come from the documents", async () => {
        const { data } = await list("inStockOnly=false");
        const byName = new Map(data.map((item) => [item.name, item]));
        matches(byName.get(nameOf("A")), {
            uuid: products.A.uuid,
            code,
            status: ProductStatus.ACTIVE,
            categoryName: category.name,
            unitShortName: piecesUnit,
            quantity: 15,
            avgPrice: 3,
            value: 45,
        }, "A");
        matches(byName.get(nameOf("B")), { quantity: 0, avgPrice: 10.4, value: 0, unitShortName: kilosUnit }, "B");
        matches(byName.get(nameOf("C")), { quantity: 0, avgPrice: isNull, value: 0 }, "C");
        matches(byName.get(nameOf("D")), { status: ProductStatus.ARCHIVED, quantity: 3, avgPrice: 5, value: 15 }, "D");
        matches(byName.get(nameOf("F")), { categoryName: ownCategory.name, quantity: 1, avgPrice: 7, value: 7 }, "F");
        matches(byName.get(nameOf("G")), { quantity: 3, avgPrice: 3.33, value: 10 }, "G");
    });

    test("with inStockOnly=false products at 0 show too, but an archived one at 0 never does", async () => {
        const { data } = await list("inStockOnly=false");
        matches(names(data), ["A", "B", "C", "D", "F", "G"].map((key) => nameOf(key as keyof typeof products)));
    });

    test("every listed quantity matches the database", async () => {
        const { data } = await list("inStockOnly=false");
        for (const item of data) equals(item.quantity, await stockOf(db, item.uuid), `${item.name} quantity`);
    });

    test("summary: total value and the count of products in stock", async () => {
        matches(await summary(), { totalValue: 77, productCount: 4 });
    });

    test("filter by category, in the list and the summary", async () => {
        const { data } = await list(`categoryUuid=${ownCategory.uuid}`);
        matches(names(data), [nameOf("F")]);
        matches(await summary(`categoryUuid=${ownCategory.uuid}`), { totalValue: 7, productCount: 1 });
    });

    test("search finds by code too", async () => {
        const { data } = await storekeeper.api.ok<IStockBalance[]>("GET", `${PATHS.STOCK_BALANCE}?search=${encodeURIComponent(code.toLowerCase())}`);
        matches(names(data), [nameOf("A")]);
    });

    test("paging", async () => {
        const { data, meta } = await storekeeper.api.ok<IStockBalance[]>("GET",
            `${PATHS.STOCK_BALANCE}?search=${encodeURIComponent(tag)}&inStockOnly=false&page=2&pageSize=2`);
        matches(names(data), [nameOf("C"), nameOf("D")]);
        matches(meta, { page: 2, pageSize: 2, total: 6, totalPages: 3 });
    });

    test("a bad query is refused", async () => {
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_BALANCE}?pageSize=101`, "pageSize");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_BALANCE}?categoryUuid=nope`, "categoryUuid");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_BALANCE}?inStockOnly=maybe`, "inStockOnly");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_BALANCE}/summary?categoryUuid=nope`, "categoryUuid");
    });

    test("Accountant can see it; Staff, no token and the Platform Owner can't", async () => {
        await companyA.accountant.api.ok("GET", PATHS.STOCK_BALANCE);
        await companyA.accountant.api.ok("GET", `${PATHS.STOCK_BALANCE}/summary`);
        for (const user of [companyA.staff, context.platformOwner]) {
            await user.api.rejects("GET", PATHS.STOCK_BALANCE, ErrorCodes.AUTH.FORBIDDEN);
            await user.api.rejects("GET", `${PATHS.STOCK_BALANCE}/summary`, ErrorCodes.AUTH.FORBIDDEN);
        }
        await anonymous.rejects("GET", PATHS.STOCK_BALANCE, ErrorCodes.AUTH.UNAUTHORIZED);
    });

    test("the other company sees none of it, even with this company's category", async () => {
        const ownerOfB = companyB.owner;
        const query = `search=${encodeURIComponent(tag)}&inStockOnly=false`;
        matches((await ownerOfB.api.ok<IStockBalance[]>("GET", `${PATHS.STOCK_BALANCE}?${query}`)).data, []);
        matches((await ownerOfB.api.ok("GET", `${PATHS.STOCK_BALANCE}/summary?${query}`)).data, { totalValue: 0, productCount: 0 });
        matches((await ownerOfB.api.ok<IStockBalance[]>("GET", `${PATHS.STOCK_BALANCE}?categoryUuid=${ownCategory.uuid}`)).data, []);
    });
});
