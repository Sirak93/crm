import {
    ErrorCodes,
    LOCALE,
    MEASURE_UNITS,
    MeasureUnit,
    ProductStatus,
    StockInReason,
    StockOutReason,
    type IProduct,
    type IProductCategory,
    type IStockInDetails,
    type IStockOutDetails,
    type ISupplier,
} from "armstock-shared";
import type { Worksheet } from "exceljs";
import { defineSuite } from "../../core/Suite";
import { anyString, equals, isTrue, matches } from "../../core/Assert";
import { createProduct, createRecipe, createStockIn, createStockOut, createSupplier, findCategory, lineOf } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import { readSheet, rowsOf } from "../../shared/Excel";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

/**
 * The stock-in, stock-out, stock balance and kitchen balance files. Documents are dated January 2019,
 * so the range holds only this suite's documents; balance cases search by this suite's name tag.
 */
export default (context: ICompanySideContext) => defineSuite("Excel exports of the lists", (test) => {
    const { companyA, companyB, db } = context;
    const storekeeper = companyA.storekeeper;
    const tag = uniqueName("ListExport").replace(" ", "");

    // Whole days in Armenian time (UTC+4), as the frontend sends them.
    const ARMENIA_OFFSET_MS = 4 * 60 * 60 * 1000;
    const range = {
        dateFrom: new Date(Date.UTC(2019, 0, 1) - ARMENIA_OFFSET_MS).toISOString(),
        dateTo: new Date(Date.UTC(2019, 1, 1) - ARMENIA_OFFSET_MS - 1).toISOString(),
    };
    const day = (date: number) => `2019-01-${String(date).padStart(2, "0")}T12:00:00.000Z`;
    // 12:00 UTC is 16:00 in Armenia.
    const armenianTime = (date: number) => `2019-01-${String(date).padStart(2, "0")}T16:00:00.000Z`;
    // Two header lines on the left (company, report), filters as a third when set, then one empty row.
    // The table's header row is the one frozen at the top.
    const tableRow = (sheet: Worksheet): number => {
        const [view] = sheet.views;
        return view.state === "frozen" ? view.ySplit ?? 0 : 0;
    };

    const download = async (path: string, params: Record<string, string | undefined>) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, value);
        const file = await storekeeper.api.download(`${path}/export?${query}`);
        return { fileName: file.fileName, sheet: await readSheet(file.content) };
    };

    let apple: IProduct;
    let bean: IProduct;
    let corn: IProduct;
    let category: IProductCategory;
    let supplier: ISupplier;
    let purchase: IStockInDetails;
    let initial: IStockInDetails;
    let issue: IStockOutDetails;
    let ret: IStockOutDetails;
    const unit = (product: IProduct) => MEASURE_UNITS[product.measureUnit].shortName.en;
    /** A document's product line: empty document columns, then product, unit, quantity. */
    const lineRow = (product: IProduct, quantity: number) => [null, null, null, null, null, product.name, unit(product), quantity];

    test("prepares products and documents in January 2019", async () => {
        category = await findCategory(storekeeper);
        [apple, bean, corn] = await Promise.all(["apple", "bean", "corn"].map((key) =>
            createProduct(storekeeper, { body: { name: `${tag} ${key}` } })));
        supplier = await createSupplier(companyA.accountant);

        purchase = await createStockIn(storekeeper, [lineOf(apple, 10), lineOf(bean, 5)], { supplierUuid: supplier.uuid, date: day(5) });
        initial = await createStockIn(storekeeper, [lineOf(apple, 3)], { date: day(6) });
        issue = await createStockOut(storekeeper, [lineOf(apple, 4)], { date: day(7) });
        ret = await createStockOut(storekeeper, [lineOf(bean, 1)], {
            reason: StockOutReason.RETURNED, department: null, supplierUuid: supplier.uuid, date: day(8),
        });
        // The other company's document on the same day never shows.
        const theirs = await createProduct(companyB.owner);
        await createStockIn(companyB.owner, [lineOf(theirs, 1)], { date: day(5) });
    });

    test("stock-in file: every document of the range, newest first, its products nested under it", async () => {
        const { fileName, sheet } = await download(PATHS.STOCK_INS, { ...range, lang: LOCALE.EN });
        equals(fileName, "stock-in_2019-01-01_2019-01-31.xlsx", "file name");
        matches(rowsOf(sheet).slice(0, 2).map((row) => [row[0], row[7]]), [
            [companyA.name, "Period: 01/01/2019 – 31/01/2019"],
            ["Stock in", anyString],
        ]);
        equals(tableRow(sheet), 4, "table header row");
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Number", "Date", "Reason", "Supplier", "Created by", "Product", "Unit", "Quantity"],
            [initial.number, armenianTime(6), "Initial stock", null, initial.createdBy.name, null, null, null],
            lineRow(apple, 3),
            [purchase.number, armenianTime(5), "Purchase", supplier.name, purchase.createdBy.name, null, null, null],
            lineRow(apple, 10),
            lineRow(bean, 5),
        ]);
        const documentRow = sheet.getRow(tableRow(sheet) + 1);
        const productRow = sheet.getRow(tableRow(sheet) + 2);
        matches([documentRow.font?.bold, documentRow.outlineLevel, productRow.outlineLevel], [true, 0, 1], "bold document, nested product");
        isTrue(!productRow.hidden, "groups open");
        equals(documentRow.getCell(2).numFmt, "dd/mm/yyyy hh:mm", "date format");
        equals(productRow.getCell(8).numFmt, "#,##0.000", "quantity format");
    });

    test("stock-in file: reason and supplier filters, written in the filters line", async () => {
        const { sheet } = await download(PATHS.STOCK_INS, {
            ...range, reason: String(StockInReason.PURCHASE), supplierUuid: supplier.uuid, lang: LOCALE.EN,
        });
        equals(rowsOf(sheet)[2][0], `Filters: Reason: Purchase · Supplier: ${supplier.name}`, "filters line");
        matches(rowsOf(sheet, tableRow(sheet) + 1).map((row) => row[0]), [purchase.number, null, null]);
    });

    test("stock-out file: destination is the supplier for a return, the department for an issue", async () => {
        const { fileName, sheet } = await download(PATHS.STOCK_OUTS, { ...range, lang: LOCALE.EN });
        equals(fileName, "stock-out_2019-01-01_2019-01-31.xlsx", "file name");
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Number", "Date", "Reason", "Where to", "Created by", "Product", "Unit", "Quantity"],
            [ret.number, armenianTime(8), "Returned", supplier.name, ret.createdBy.name, null, null, null],
            lineRow(bean, 1),
            [issue.number, armenianTime(7), "Issued", "Kitchen", issue.createdBy.name, null, null, null],
            lineRow(apple, 4),
        ]);
    });

    test("stock-out file in Armenian, filtered by reason", async () => {
        const { sheet } = await download(PATHS.STOCK_OUTS, { ...range, reason: String(StockOutReason.ISSUED), lang: LOCALE.HY });
        matches(rowsOf(sheet).slice(1, 3).map((row) => row[0]), ["Ելք", "Ֆիլտրեր: Պատճառ: Տրամադրում"]);
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Համար", "Ամսաթիվ", "Պատճառ", "Ուր", "Ստեղծող", "Ապրանք", "Միավոր", "Քանակ"],
            [issue.number, armenianTime(7), "Տրամադրում", "Խոհանոց", issue.createdBy.name, null, null, null],
            [null, null, null, null, null, apple.name, "հատ", 4],
        ]);
    });

    test("stock balance file: products in stock by name; 'in stock only' off adds products at 0", async () => {
        const { fileName, sheet } = await download(PATHS.STOCK_BALANCE, { search: tag, lang: LOCALE.EN });
        isTrue(/^stock-balance_\d{4}-\d{2}-\d{2}\.xlsx$/.test(fileName ?? ""), "file name with today");
        const [, title, filters] = rowsOf(sheet).map((row) => row[0]);
        matches([title, filters], ["Stock balance", `Filters: Search: ${tag}`]);
        isTrue(String(rowsOf(sheet)[0][4]).startsWith("Generated: "), "generated on the right");
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Product", "Code", "Category", "Unit", "Quantity"],
            [apple.name, apple.code, category.name, unit(apple), 9],
            [bean.name, bean.code, category.name, unit(bean), 4],
        ]);
        equals(sheet.getCell(tableRow(sheet) + 1, 5).numFmt, "#,##0.000", "quantity format");

        const all = await download(PATHS.STOCK_BALANCE, { search: tag, inStockOnly: "false", lang: LOCALE.EN });
        matches(rowsOf(all.sheet, tableRow(all.sheet) + 1).map((row) => [row[0], row[4]]), [[apple.name, 9], [bean.name, 4], [corn.name, 0]]);
    });

    test("kitchen balance file: what was issued to the kitchen, 6 decimals", async () => {
        const { fileName, sheet } = await download(PATHS.KITCHEN_BALANCE, { search: tag, lang: LOCALE.EN });
        isTrue(/^kitchen-balance_\d{4}-\d{2}-\d{2}\.xlsx$/.test(fileName ?? ""), "file name with today");
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Product", "Category", "Unit", "Quantity"],
            [apple.name, category.name, unit(apple), 4],
        ]);
        equals(sheet.getCell(tableRow(sheet) + 1, 4).numFmt, "#,##0.000000", "quantity format");
    });

    test("one stock-in: details in the header, its lines with packs as typed", async () => {
        const flour = await createProduct(storekeeper, { allowsDecimals: true, body: { name: `${tag} flour` } });
        const doc = await createStockIn(storekeeper, [], {
            supplierUuid: supplier.uuid,
            invoiceNumber: "INV-7",
            note: "Back door",
            date: day(9),
            lines: [
                { productUuid: flour.uuid, pack: { quantity: 0.5, unit: MeasureUnit.GRAM, count: 2 } },
                { productUuid: apple.uuid, pack: { quantity: 2, unit: apple.measureUnit, count: 1 } },
            ],
        });
        const file = await storekeeper.api.download(`${PATHS.STOCK_INS}/${doc.uuid}/export?lang=en`);
        equals(file.fileName, `stock-in_${doc.number}.xlsx`, "file name");
        const sheet = await readSheet(file.content);
        matches(rowsOf(sheet).slice(0, 4).map((row) => row[0]), [
            companyA.name,
            `Stock in ${doc.number}`,
            `Date: 09/01/2019 16:00 · Reason: Purchase · Supplier: ${supplier.name} · Supplier's invoice №: INV-7`,
            `Created by: ${doc.createdBy.name} · Note: Back door`,
        ]);
        isTrue(String(rowsOf(sheet)[0][3]).startsWith("Generated: "), "generated on the right");
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Product", "Unit", "Package", "Quantity"],
            [flour.name, unit(flour), "2 × 500 g", 1],
            [apple.name, unit(apple), null, 2],
        ]);
    });

    test("one by-recipe stock-out: each product's recipes nested under it", async () => {
        const recipe = await createRecipe(companyA.owner, [lineOf(apple, 1)]);
        const doc = await createStockOut(storekeeper, [], {
            date: day(10),
            recipes: [{ recipeUuid: recipe.uuid, persons: 2 }],
            lines: [{ productUuid: apple.uuid, quantity: 3, extraQuantity: 1 }],
        });
        const file = await storekeeper.api.download(`${PATHS.STOCK_OUTS}/${doc.uuid}/export?lang=en`);
        equals(file.fileName, `stock-out_${doc.number}.xlsx`, "file name");
        const sheet = await readSheet(file.content);
        matches(rowsOf(sheet).slice(1, 3).map((row) => row[0]), [
            `Stock out ${doc.number}`,
            "Date: 10/01/2019 16:00 · Reason: Issued (by recipe) · Where to: Kitchen",
        ]);
        matches(rowsOf(sheet, tableRow(sheet)), [
            ["Product", "Unit", "Quantity"],
            [apple.name, unit(apple), 3],
            [`${recipe.name} × 2 persons`, null, 2],
        ]);
        const productRow = sheet.getRow(tableRow(sheet) + 1);
        const recipeRow = sheet.getRow(tableRow(sheet) + 2);
        matches([productRow.font?.bold, recipeRow.outlineLevel, recipeRow.getCell(3).numFmt], [true, 1, "#,##0.000000"]);
    });

    test("one document: language required; unknown or other company's document not found", async () => {
        const theirs = await createStockIn(companyB.owner, [lineOf(await createProduct(companyB.owner), 1)]);
        const theirOut = await createStockOut(companyB.owner, [lineOf(theirs.lines[0].product, 1)]);
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_INS}/${purchase.uuid}/export`, "lang");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_OUTS}/nope/export?lang=en`, "uuid");
        await storekeeper.api.rejects("GET", `${PATHS.STOCK_INS}/${theirs.uuid}/export?lang=en`, ErrorCodes.STOCK_IN.NOT_FOUND);
        await storekeeper.api.rejects("GET", `${PATHS.STOCK_OUTS}/${theirOut.uuid}/export?lang=en`, ErrorCodes.STOCK_OUT.NOT_FOUND);
    });

    test("a file over 20,000 rows is refused with the limit, before anything is built", async () => {
        const many = uniqueName("TooMany").replace(" ", "");
        await db.query(
            `INSERT INTO products (company_uuid, name, measure_unit, category_uuid, status)
             SELECT $1, $2 || ' ' || n, $3, $4, $5 FROM generate_series(1, 20001) AS n`,
            [companyA.uuid, many, MeasureUnit.PIECE, category.uuid, ProductStatus.ACTIVE],
        );
        try {
            const response = await storekeeper.api.rejects("GET",
                `${PATHS.STOCK_BALANCE}/export?lang=en&inStockOnly=false&search=${encodeURIComponent(many)}`, ErrorCodes.EXPORT.TOO_MANY_ROWS);
            matches(response.body.error.meta, { max: 20_000 });
        } finally {
            await db.query("DELETE FROM products WHERE company_uuid = $1 AND name LIKE $2", [companyA.uuid, `${many} %`]);
        }
    });

    test("every list file needs a language and refuses a bad filter", async () => {
        for (const path of [PATHS.STOCK_INS, PATHS.STOCK_OUTS, PATHS.STOCK_BALANCE, PATHS.KITCHEN_BALANCE]) {
            await storekeeper.api.rejectsField("GET", `${path}/export`, "lang");
            await storekeeper.api.rejectsField("GET", `${path}/export?lang=fr`, "lang");
        }
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_INS}/export?lang=en&reason=99`, "reason");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_OUTS}/export?lang=en&receiverUuid=nope`, "receiverUuid");
        await storekeeper.api.rejectsField("GET", `${PATHS.STOCK_BALANCE}/export?lang=en&inStockOnly=maybe`, "inStockOnly");
        await storekeeper.api.rejectsField("GET", `${PATHS.KITCHEN_BALANCE}/export?lang=en&categoryUuid=nope`, "categoryUuid");
    });
});
