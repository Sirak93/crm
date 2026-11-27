import {
    ErrorCodes,
    LOCALE,
    MEASURE_UNITS,
    PRODUCT_MOVEMENT_PAGE_SIZE,
    ProductStatus,
    StockDocumentType,
    StockInReason,
    StockOutReason,
    type IProduct,
    type IProductCategory,
    type IProductMovement,
    type IRecipeDetails,
    type IStockMovement,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, matches } from "../../core/Assert";
import { createCategory, createProduct, createRecipe, createStockIn, createStockOut, lineOf, recipeBody, stockOutBody } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
import { stockOf } from "../../shared/Stock";
import { readSheet, rowsOf } from "../../shared/Excel";
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
    let figRecipe: IRecipeDetails;
    /** Apple's documents in date order: in 100, out 30, in 10, out 5. */
    const appleDocs: { uuid: string; number: string; date: string }[] = [];
    const keepDoc = ({ uuid, number, date }: { uuid: string; number: string; date: string }) => appleDocs.push({ uuid, number, date });

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
        keepDoc(await createStockIn(storekeeper, [lineOf(apple, 100)], { date: day(3, 5) }));
        await createStockIn(storekeeper, [lineOf(date, 5)], { date: day(3, 10) });
        await createStockOut(storekeeper, [lineOf(date, 5)], { date: day(3, 11) });
        await createStockIn(storekeeper, [lineOf(egg, 4)], { date: day(3, 12) });
        keepDoc(await createStockOut(storekeeper, [lineOf(apple, 30)], { date: day(3, 20) }));
        keepDoc(await createStockIn(storekeeper, [lineOf(apple, 10)], { date: day(4, 10) }));
        // The kitchen has the 5 figs from March, so the recipe needs no new ones.
        figRecipe = await createRecipe(companyA.owner, [lineOf(fig, 1)]);
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, stockOutBody([], {
            date: day(4, 15),
            recipes: [{ recipeUuid: figRecipe.uuid, persons: 2 }],
            lines: [{ productUuid: fig.uuid, quantity: 0, extraQuantity: 0 }],
        }));
        keepDoc(await createStockOut(storekeeper, [lineOf(apple, 5)], { date: day(5, 2) }));
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

    const productMovement = (product: IProduct, params: Record<string, string | undefined> = {}) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, value);
        return storekeeper.api.ok<IProductMovement>("GET", `${PATHS.STOCK_MOVEMENT}/${product.uuid}?${query}`);
    };

    test("product popup: every document oldest first, with the stock after each", async () => {
        const { data, meta } = await productMovement(products.apple);
        matches(data.documents, [
            { ...appleDocs[0], type: StockDocumentType.STOCK_IN, reason: StockInReason.INITIAL_STOCK, incoming: 100, outgoing: 0, stockAfter: 100, recipes: [] },
            { ...appleDocs[1], type: StockDocumentType.STOCK_OUT, reason: StockOutReason.ISSUED, incoming: 0, outgoing: 30, stockAfter: 70 },
            { ...appleDocs[2], type: StockDocumentType.STOCK_IN, incoming: 10, outgoing: 0, stockAfter: 80 },
            { ...appleDocs[3], type: StockDocumentType.STOCK_OUT, incoming: 0, outgoing: 5, stockAfter: 75 },
        ]);
        matches(meta, { page: 1, total: 4, totalPages: 1 });
    });

    test("product popup: the header has the same numbers as the table row; stock after starts from the initial", async () => {
        for (const range of [{ dateFrom: from(4), dateTo: to(4) }, { dateFrom: from(4) }, { dateTo: to(3) }, {}]) {
            const [{ data }, rows] = await Promise.all([productMovement(products.apple, range), list({ ...range, withoutMovement: "true" })]);
            const row = rows.data.find((item) => item.uuid === products.apple.uuid)!;
            matches(data.product, row, `header for ${JSON.stringify(range)}`);
        }
        const { data } = await productMovement(products.apple, { dateFrom: from(4) });
        matches(data.product, { initial: 70, incoming: 10, outgoing: 5, final: 75 });
        matches(data.documents.map((doc) => doc.stockAfter), [80, 75]);
    });

    test("product popup: a by-recipe stock-out shows its recipes from the saved copy", async () => {
        const { data } = await productMovement(products.fig, { dateFrom: from(4), dateTo: to(4) });
        matches(data.documents, [{
            type: StockDocumentType.STOCK_OUT,
            outgoing: 0,
            stockAfter: 5,
            recipes: [{ name: figRecipe.name, persons: 2, quantity: 2 }],
        }]);
        // Changing the recipe later leaves the document as it was that day.
        await companyA.owner.api.ok("PUT", `${PATHS.RECIPES}/${figRecipe.uuid}`, recipeBody([lineOf(products.fig, 3)], { name: figRecipe.name }));
        const after = await productMovement(products.fig, { dateFrom: from(4), dateTo: to(4) });
        matches(after.data.documents[0].recipes, [{ persons: 2, quantity: 2 }]);
    });

    test("product popup: same date → the one created first; one stock-in with the product twice is one row; stock after across pages", async () => {
        const grape = await createProduct(storekeeper, { body: { name: `${tag} grape` } });
        const sameDay = "2020-06-01T12:00:00.000Z";
        await createStockIn(storekeeper, [lineOf(grape, 2), lineOf(grape, 3)], { date: sameDay });
        await createStockOut(storekeeper, [lineOf(grape, 2)], { date: sameDay });
        await createStockIn(storekeeper, [lineOf(grape, 3)], { date: sameDay });
        await createStockOut(storekeeper, [lineOf(grape, 1)], { date: sameDay });
        await createStockIn(storekeeper, [lineOf(grape, 4)], { date: sameDay });

        const pages = await Promise.all([1, 2, 3].map((page) => productMovement(grape, { page: String(page), pageSize: "2" })));
        matches(pages.map(({ data }) => data.documents.map((doc) => [doc.incoming, doc.outgoing, doc.stockAfter])), [
            [[5, 0, 5], [0, 2, 3]],
            [[3, 0, 6], [0, 1, 5]],
            [[4, 0, 9]],
        ]);
        matches(pages[2].meta, { page: 3, pageSize: 2, total: 5, totalPages: 3 });
        matches(pages[2].data.product, { initial: 0, incoming: 12, outgoing: 3, final: 9 });
    });

    test("product popup: a product without movement in the range has no rows; unknown product and bad query refused", async () => {
        const { data, meta } = await productMovement(products.bean, { dateFrom: from(3), dateTo: to(3) });
        matches(data, { product: { initial: 20, incoming: 0, outgoing: 0, final: 20 }, documents: [] });
        equals(meta.total, 0, "total");
        await storekeeper.api.rejects("GET", `${PATHS.STOCK_MOVEMENT}/${randomUuid()}`, ErrorCodes.PRODUCT.NOT_FOUND);
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_MOVEMENT}/nope`, "uuid");
        for (const [query, field] of [["dateFrom=nope", "dateFrom"], ["pageSize=101", "pageSize"], ["page=0", "page"]]) {
            await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_MOVEMENT}/${products.apple.uuid}?${query}`, field);
        }
    });

    test("product popup: the default page has 50 rows", async () => {
        const { meta } = await productMovement(products.apple);
        equals(meta.pageSize, PRODUCT_MOVEMENT_PAGE_SIZE, "pageSize");
    });
    // Whole days in Armenian time (UTC+4), as the frontend sends them.
    const ARMENIA_OFFSET_MS = 4 * 60 * 60 * 1000;
    const armFrom = (month: number) => new Date(Date.UTC(2021, month - 1, 1) - ARMENIA_OFFSET_MS).toISOString();
    const armTo = (month: number) => new Date(Date.UTC(2021, month, 1) - ARMENIA_OFFSET_MS - 1).toISOString();
    const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const TABLE_HEADER_ROW = 7;
    const exportPath = (path: string, params: Record<string, string | undefined>) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, value);
        return `${path}?${query}`;
    };
    const unitOf = (key: Key) => MEASURE_UNITS[products[key].measureUnit].shortName.en;

    test("Excel table file: header block, every row for the filters (no paging), real numbers, frozen bold header", async () => {
        const file = await storekeeper.api.download(exportPath(`${PATHS.STOCK_MOVEMENT}/export`, {
            search: tag, dateFrom: armFrom(3), dateTo: armTo(3), lang: LOCALE.EN,
        }));
        equals(file.contentType, XLSX, "content type");
        equals(file.fileName, "stock-movement_2021-03-01_2021-03-31.xlsx", "file name");

        const sheet = await readSheet(file.content);
        const [company, title, period, generated, filters] = rowsOf(sheet).slice(0, 5).map((row) => row[0]);
        matches([company, title, period], [companyA.name, "Stock movement", "Period: 01/03/2021 – 31/03/2021"]);
        matches(String(generated).startsWith("Generated: "), true, "generated line");
        equals(filters, `Filters: Search: ${tag} · Products without movement: no`, "filters line");
        matches(rowsOf(sheet, TABLE_HEADER_ROW), [
            ["Product", "Unit", "Initial", "In", "Out", "Final"],
            [nameOf("apple"), unitOf("apple"), 0, 100, 30, 70],
            [nameOf("date"), unitOf("date"), 0, 5, 5, 0],
            [`${nameOf("egg")} (archived)`, unitOf("egg"), 0, 4, 0, 4],
            [nameOf("fig"), unitOf("fig"), 10, 0, 5, 5],
        ]);
        equals(sheet.getRow(TABLE_HEADER_ROW).font?.bold, true, "bold header");
        matches(sheet.views[0], { state: "frozen", ySplit: TABLE_HEADER_ROW });
        equals(sheet.getCell(TABLE_HEADER_ROW + 1, 3).numFmt, "#,##0.000", "quantity format");
    });

    test("Excel table file: category and checkbox filters, Armenian texts", async () => {
        const file = await storekeeper.api.download(exportPath(`${PATHS.STOCK_MOVEMENT}/export`, {
            categoryUuid: ownCategory.uuid, withoutMovement: "true", dateFrom: armFrom(4), lang: LOCALE.HY,
        }));
        equals(file.fileName, "stock-movement_2021-04-01.xlsx", "file name");
        const sheet = await readSheet(file.content);
        const rows = rowsOf(sheet);
        matches(rows.slice(1, 3).map((row) => row[0]), ["Ապրանքների շարժ", "Ժամանակահատված: Սկսած 01/04/2021"]);
        equals(rows[4][0], `Ֆիլտրեր: Կատեգորիա: ${ownCategory.name} · Առանց շարժի ապրանքները: այո`, "filters line");
        matches(rows.slice(TABLE_HEADER_ROW - 1).map((row) => row[0]), ["Ապրանք", nameOf("bean")]);
    });

    test("Excel product file: initial stock row, documents in Armenian time, total row", async () => {
        const file = await storekeeper.api.download(exportPath(`${PATHS.STOCK_MOVEMENT}/${products.apple.uuid}/export`, {
            dateFrom: armFrom(4), lang: LOCALE.EN,
        }));
        equals(file.contentType, XLSX, "content type");
        equals(file.fileName, `product-movement_${nameOf("apple").replace(" ", "-")}_2021-04-01.xlsx`, "file name");

        const sheet = await readSheet(file.content);
        matches(rowsOf(sheet).slice(1, 4).map((row) => row[0]), [
            "Product movement",
            `Product: ${nameOf("apple")} (${unitOf("apple")})`,
            "Period: From 01/04/2021",
        ]);
        // Documents are at 12:00 UTC, so 16:00 in Armenia.
        matches(rowsOf(sheet, TABLE_HEADER_ROW), [
            ["Date", "Document", "Reason", "In", "Out", "Stock after"],
            [null, null, "Initial stock", null, null, 70],
            ["2021-04-10T16:00:00.000Z", appleDocs[2].number, "Initial stock", 10, null, 80],
            ["2021-05-02T16:00:00.000Z", appleDocs[3].number, "Issued", null, 5, 75],
            [null, null, "Total", 10, 5, 75],
        ]);
        equals(sheet.getCell(TABLE_HEADER_ROW + 2, 1).numFmt, "dd/mm/yyyy hh:mm", "date format");
    });

    test("Excel product file: a by-recipe stock-out is marked; every document, not only the first page", async () => {
        const fig = await readSheet((await storekeeper.api.download(exportPath(`${PATHS.STOCK_MOVEMENT}/${products.fig.uuid}/export`, {
            dateFrom: armFrom(4), dateTo: armTo(4), lang: LOCALE.EN,
        }))).content);
        equals(rowsOf(fig, TABLE_HEADER_ROW + 2)[0][2], "Issued (by recipe)", "by-recipe reason");

        const many = await createProduct(storekeeper, { body: { name: `${tag} many` } });
        const count = PRODUCT_MOVEMENT_PAGE_SIZE + 1;
        await Promise.all(Array.from({ length: count }, () => createStockIn(storekeeper, [lineOf(many, 1)], { date: day(1, 10) })));
        const sheet = await readSheet((await storekeeper.api.download(exportPath(`${PATHS.STOCK_MOVEMENT}/${many.uuid}/export`, {
            lang: LOCALE.EN,
        }))).content);
        // Header, initial stock, the documents, total.
        equals(sheet.rowCount, TABLE_HEADER_ROW + 1 + count + 1, "rows");
        matches(rowsOf(sheet, sheet.rowCount)[0].slice(2), ["Total", count, 0, count]);
    });

    test("Excel: language required, bad query and unknown or other company's product refused", async () => {
        const table = `${PATHS.STOCK_MOVEMENT}/export`;
        const product = `${PATHS.STOCK_MOVEMENT}/${products.apple.uuid}/export`;
        for (const path of [table, product]) {
            await storekeeper.api.rejectsField("GET", path, "lang");
            await storekeeper.api.rejectsField("GET", `${path}?lang=fr`, "lang");
            await storekeeper.api.rejectsField("GET", `${path}?lang=en&dateFrom=nope`, "dateFrom");
        }
        await storekeeper.api.rejectsField("GET", `${table}?lang=en&categoryUuid=nope`, "categoryUuid");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_MOVEMENT}/nope/export?lang=en`, "uuid");
        await storekeeper.api.rejects("GET", `${PATHS.STOCK_MOVEMENT}/${randomUuid()}/export?lang=en`, ErrorCodes.PRODUCT.NOT_FOUND);
        const theirs = await createProduct(companyB.owner, { body: { name: `${tag} theirs` } });
        await storekeeper.api.rejects("GET", `${PATHS.STOCK_MOVEMENT}/${theirs.uuid}/export?lang=en`, ErrorCodes.PRODUCT.NOT_FOUND);
    });

    test("Excel: Accountant can export; Staff, no token and the Platform Owner can't", async () => {
        const paths = [`${PATHS.STOCK_MOVEMENT}/export?lang=en`, `${PATHS.STOCK_MOVEMENT}/${products.apple.uuid}/export?lang=en`];
        for (const path of paths) {
            await companyA.accountant.api.download(path);
            for (const user of [companyA.staff, context.platformOwner]) await user.api.rejects("GET", path, ErrorCodes.AUTH.FORBIDDEN);
            await anonymous.rejects("GET", path, ErrorCodes.AUTH.UNAUTHORIZED);
        }
    });
});
