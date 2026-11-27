import {
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    MeasureUnit,
    PACK_COUNT_MAX,
    ProductReceivedAs,
    ProductStatus,
    QUANTITY_MAX,
    StockInReason,
    SupplierStatus,
    type IProduct,
    type IStockIn,
    type IStockInDetails,
    type IStockInSummary,
    type ISupplier,
} from "armstock-shared";
import { appYear } from "../../../../utils/appDate";
import { defineSuite } from "../../core/Suite";
import { equals, isNull, isTrue, matches } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { createProduct, createStockIn, createStockOut, createSupplier, PIECES_UNIT, stockInBody, lineOf } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid } from "../../shared/Random";
import { expectStock } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

const NUMBER_FORMAT = /^IN-\d{4}-\d{4}$/;
const ONE_HOUR_MS = 60 * 60 * 1000;

export default (context: ICompanySideContext) => defineSuite("Stock-in", (test) => {
    const { db, anonymous, companyA, companyB } = context;
    const storekeeper = companyA.storekeeper;
    const path = (uuid: string) => `${PATHS.STOCK_INS}/${uuid}`;

    // Filled by the first case, used by the rest.
    let pieces: IProduct;
    let kilos: IProduct;
    let supplier: ISupplier;
    let productOfB: IProduct;
    let supplierOfB: ISupplier;

    const line = (product: IProduct, quantity: number) => lineOf(product, quantity);
    const stockInCount = async () => db.count("stock_ins", "company_uuid = $1", [companyA.uuid]);
    const post = (body: unknown) => storekeeper.api.send("POST", PATHS.STOCK_INS, body);

    test("prepares products and suppliers", async () => {
        [pieces, kilos, supplier, productOfB, supplierOfB] = await Promise.all([
            createProduct(storekeeper),
            createProduct(storekeeper, { allowsDecimals: true }),
            createSupplier(companyA.accountant),
            createProduct(companyB.storekeeper),
            createSupplier(companyB.accountant),
        ]);
    });

    // --- Rules per reason ---

    test("purchase: saved with supplier, invoice and lines; stock goes up", async () => {
        const doc = await createStockIn(storekeeper, [line(pieces, 4), line(kilos, 1.25)], {
            supplierUuid: supplier.uuid,
            invoiceNumber: "INV-1",
        });
        matches(doc, {
            reason: StockInReason.PURCHASE,
            supplier: { uuid: supplier.uuid, name: supplier.name },
            invoiceNumber: "INV-1",
            note: isNull,
            productCount: 2,
            createdBy: { uuid: storekeeper.uuid },
            lines: [
                { product: { uuid: pieces.uuid, measureUnit: PIECES_UNIT }, quantity: 4 },
                { product: { uuid: kilos.uuid }, quantity: 1.25 },
            ],
        });
        isTrue(NUMBER_FORMAT.test(doc.number), `number "${doc.number}" has the IN-YYYY-NNNN form`);
        await expectStock(db, pieces.uuid, 4);
        await expectStock(db, kilos.uuid, 1.25);
    });

    test("document number year is the Armenian year, also on 1 Jan 00:00-04:00 (still 31 Dec in UTC)", async () => {
        equals(appYear(new Date("2026-12-31T20:00:00.000Z")), 2027, "1 Jan 00:00 in Armenia");
        equals(appYear(new Date("2026-12-31T23:59:59.000Z")), 2027, "1 Jan 03:59 in Armenia");
        equals(appYear(new Date("2026-12-31T19:59:59.000Z")), 2026, "31 Dec 23:59 in Armenia");

        // Its own product, so the stock counts of the other cases stay as they are.
        const doc = await createStockIn(storekeeper, [line(await createProduct(storekeeper), 1)]);
        equals(doc.number.split("-")[1], String(appYear(new Date())), "a new document's number year");
    });

    test("purchase without a supplier is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, "supplierUuid",
            stockInBody([line(pieces, 1)], { reason: StockInReason.PURCHASE }));
    });

    test("initial stock drops the supplier and invoice", async () => {
        const doc = await createStockIn(storekeeper, [line(pieces, 6)], {
            reason: StockInReason.INITIAL_STOCK,
            supplierUuid: supplier.uuid,
            invoiceNumber: "INV-2",
        });
        matches(doc, { reason: StockInReason.INITIAL_STOCK, supplier: isNull, invoiceNumber: isNull });
        await expectStock(db, pieces.uuid, 10);
    });

    test("Other needs a note", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, "note", stockInBody([line(pieces, 1)], { reason: StockInReason.OTHER }));
        const doc = await createStockIn(storekeeper, [line(pieces, 1)], { reason: StockInReason.OTHER, note: "Found in storage" });
        matches(doc, { reason: StockInReason.OTHER, note: "Found in storage", supplier: isNull });
        await expectStock(db, pieces.uuid, 11);
    });

    // --- Quantities ---

    test("no prices: a sent price is ignored, the document and its lines have none", async () => {
        const body = stockInBody([line(pieces, 4)]);
        const { data } = await storekeeper.api.ok<IStockInDetails>("POST", PATHS.STOCK_INS, {
            ...body,
            lines: [{ ...body.lines[0], price: 10, total: 40 }],
        });
        isTrue(!("total" in data), "no document total");
        isTrue(!("price" in data.lines[0]!) && !("total" in data.lines[0]!), "no line price or total");
        await expectStock(db, pieces.uuid, 15);
    });

    test("a whole-number unit refuses a fraction; a decimal unit takes 3 decimals, not 4", async () => {
        await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.PRODUCT.QUANTITY_NOT_WHOLE, stockInBody([line(pieces, 1.5)]));
        await createStockIn(storekeeper, [line(kilos, 0.125)]);
        await expectStock(db, kilos.uuid, 1.375);
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, "lines.0.pack.quantity", stockInBody([line(kilos, 0.1255)]));
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, "lines.0.pack.quantity", stockInBody([line(kilos, 0)]));
    });

    // --- Packs: Amount × Count = Total ---

    const packLine = (product: IProduct, quantity: number, count: number, unit: MeasureUnit = product.measureUnit) =>
        ({ productUuid: product.uuid, pack: { quantity, unit, count } });
    const postLines = (lines: unknown[]) => storekeeper.api.ok<IStockInDetails>("POST", PATHS.STOCK_INS, { ...stockInBody([]), lines });

    test("packs: the backend works out the total; 6 × 500 ml of a litre product is 3 l", async () => {
        const [oil, eggs] = await Promise.all([
            createProduct(storekeeper, { body: { measureUnit: MeasureUnit.LITER } }),
            createProduct(storekeeper),
        ]);
        const { data } = await postLines([packLine(oil, 0.5, 6, MeasureUnit.MILLILITER), packLine(eggs, 30, 5)]);
        matches(data.lines, [
            { product: { uuid: oil.uuid }, pack: { quantity: 0.5, unit: MeasureUnit.MILLILITER, count: 6 }, quantity: 3 },
            { product: { uuid: eggs.uuid }, pack: { quantity: 30, unit: PIECES_UNIT, count: 5 }, quantity: 150 },
        ]);
        await expectStock(db, oil.uuid, 3);
        await expectStock(db, eggs.uuid, 150);
        const { data: saved } = await storekeeper.api.ok<IStockInDetails>("GET", path(data.uuid));
        matches(saved.lines[0]!, { pack: { quantity: 0.5, unit: MeasureUnit.MILLILITER, count: 6 }, quantity: 3 });
    });

    test("packs: received as is a form setting only - a Loose product with 3 packs is still saved", async () => {
        const potatoes = await createProduct(storekeeper, { allowsDecimals: true, body: { receivedAs: ProductReceivedAs.LOOSE } });
        const { data } = await postLines([packLine(potatoes, 25, 3)]);
        matches(data.lines, [{ product: { uuid: potatoes.uuid, receivedAs: ProductReceivedAs.LOOSE }, pack: { quantity: 25, count: 3 }, quantity: 75 }]);
        await expectStock(db, potatoes.uuid, 75);
    });

    test("packs: the same product on two lines (0.5 l and 5 l bottles) adds up", async () => {
        const oil = await createProduct(storekeeper, { body: { measureUnit: MeasureUnit.LITER } });
        const { data } = await postLines([packLine(oil, 0.5, 4), packLine(oil, 5, 2)]);
        matches(data, { productCount: 1, lines: [{ quantity: 2 }, { quantity: 10 }] });
        await expectStock(db, oil.uuid, 12);
    });

    test("packs: the count is a whole number above 0; a count unit refuses a fractional amount", async () => {
        const reject = (field: string, lines: unknown[]) =>
            storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, field, { ...stockInBody([]), lines });
        await reject("lines.0.pack.count", [packLine(kilos, 1, 1.5)]);
        await reject("lines.0.pack.count", [packLine(kilos, 1, 0)]);
        await reject("lines.0.pack.count", [packLine(kilos, 1, PACK_COUNT_MAX + 1)]);
        await reject("lines.0.pack.count", [packLine(kilos, QUANTITY_MAX, 2)]);
        await reject("lines.0.pack.unit", [packLine(kilos, 1, 1, 999 as MeasureUnit)]);
        await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.PRODUCT.QUANTITY_NOT_WHOLE,
            { ...stockInBody([]), lines: [packLine(pieces, 0.5, 2)] });
    });

    test("packs: a unit of another type is refused (litre product typed in grams, pieces typed in boxes)", async () => {
        const before = await stockInCount();
        const oil = await createProduct(storekeeper, { body: { measureUnit: MeasureUnit.LITER } });
        for (const bad of [packLine(oil, 1, 1, MeasureUnit.GRAM), packLine(pieces, 1, 1, MeasureUnit.BOX)]) {
            await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.STOCK_IN.PACK_UNIT_MISMATCH, { ...stockInBody([]), lines: [bad] });
        }
        equals(await stockInCount(), before, "stock-in count");
        await expectStock(db, oil.uuid, 0);
    });

    test("a date in the future and a document without lines are refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, "date",
            stockInBody([line(pieces, 1)], { date: new Date(Date.now() + ONE_HOUR_MS).toISOString() }));
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_INS, "lines", stockInBody([]));
    });

    // --- References ---

    test("a product or supplier of another company is refused", async () => {
        const before = await stockInCount();
        await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.PRODUCT.NOT_FOUND, stockInBody([line(productOfB, 1)]));
        await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.SUPPLIER.NOT_FOUND,
            stockInBody([line(pieces, 1)], { supplierUuid: supplierOfB.uuid }));
        equals(await stockInCount(), before, "stock-in count");
        await expectStock(db, productOfB.uuid, 0);
    });

    test("an archived product or supplier can't be picked in a new document", async () => {
        const archivedProduct = await createProduct(storekeeper);
        const archivedSupplier = await createSupplier(companyA.accountant);
        await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${archivedProduct.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await companyA.accountant.api.ok("PATCH", `${PATHS.SUPPLIERS}/${archivedSupplier.uuid}/status`, { status: SupplierStatus.ARCHIVED });

        await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.PRODUCT.ARCHIVED, stockInBody([line(archivedProduct, 1)]));
        await storekeeper.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.SUPPLIER.ARCHIVED,
            stockInBody([line(pieces, 1)], { supplierUuid: archivedSupplier.uuid }));
    });

    test("an archived product and supplier already in the document stay on edit", async () => {
        const product = await createProduct(storekeeper);
        const oldSupplier = await createSupplier(companyA.accountant);
        const doc = await createStockIn(storekeeper, [line(product, 5)], { supplierUuid: oldSupplier.uuid });
        await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${product.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await companyA.accountant.api.ok("PATCH", `${PATHS.SUPPLIERS}/${oldSupplier.uuid}/status`, { status: SupplierStatus.ARCHIVED });

        await storekeeper.api.ok("PUT", path(doc.uuid), stockInBody([line(product, 7)], { supplierUuid: oldSupplier.uuid }));
        await expectStock(db, product.uuid, 7);
    });

    // --- Edit and delete ---

    let edited: IStockInDetails;
    let editProduct: IProduct;

    test("the creator can edit; stock follows the new quantity", async () => {
        editProduct = await createProduct(storekeeper);
        edited = await createStockIn(storekeeper, [line(editProduct, 10)]);
        await storekeeper.api.ok("PUT", path(edited.uuid), stockInBody([line(editProduct, 12)]));
        await expectStock(db, editProduct.uuid, 12);
        await storekeeper.api.ok("PUT", path(edited.uuid), stockInBody([line(editProduct, 10)]));
        await expectStock(db, editProduct.uuid, 10);
    });

    test("edit below what already went out is refused, nothing changes", async () => {
        await createStockOut(storekeeper, [line(editProduct, 7)]);
        await expectStock(db, editProduct.uuid, 3);

        const response = await storekeeper.api.rejects("PUT", path(edited.uuid), ErrorCodes.STOCK.NOT_ENOUGH, stockInBody([line(editProduct, 5)]));
        matches(response.body.error.meta, [{ name: editProduct.name, available: 3 }]);
        await expectStock(db, editProduct.uuid, 3);

        await storekeeper.api.ok("PUT", path(edited.uuid), stockInBody([line(editProduct, 7)]));
        await expectStock(db, editProduct.uuid, 0);
    });

    test("delete of a stock-in whose goods already went out is refused", async () => {
        const response = await storekeeper.api.rejects("DELETE", path(edited.uuid), ErrorCodes.STOCK.NOT_ENOUGH);
        matches(response.body.error.meta, [{ name: editProduct.name, available: 0 }]);
        await storekeeper.api.ok("GET", path(edited.uuid));
        await expectStock(db, editProduct.uuid, 0);
    });

    test("removing a product from the lines counts as taking its stock away", async () => {
        const response = await storekeeper.api.rejects("PUT", path(edited.uuid), ErrorCodes.STOCK.NOT_ENOUGH, stockInBody([line(kilos, 1)]));
        matches(response.body.error.meta, [{ name: editProduct.name }]);
        await expectStock(db, editProduct.uuid, 0);
        await expectStock(db, kilos.uuid, 1.375);
    });

    test("edit replaces the lines and the header", async () => {
        const doc = await createStockIn(storekeeper, [line(pieces, 2)], { supplierUuid: supplier.uuid, invoiceNumber: "INV-3" });
        const { data } = await storekeeper.api.ok<IStockInDetails>("PUT", path(doc.uuid),
            stockInBody([line(kilos, 2), line(pieces, 1)], { reason: StockInReason.OTHER, note: "Recounted" }));
        matches(data, {
            uuid: doc.uuid,
            number: doc.number,
            reason: StockInReason.OTHER,
            supplier: isNull,
            invoiceNumber: isNull,
            note: "Recounted",
            lines: [{ product: { uuid: kilos.uuid }, quantity: 2 }, { product: { uuid: pieces.uuid }, quantity: 1 }],
        });
        await expectStock(db, pieces.uuid, 16);
        await expectStock(db, kilos.uuid, 3.375);
    });

    test("lines carry the document date; changing the date moves them too", async () => {
        const linesOnDocDate = (uuid: string) =>
            db.count("stock_in_lines", "stock_in_uuid = $1 AND date = (SELECT date FROM stock_ins WHERE uuid = $1)", [uuid]);
        const dayAgo = new Date(Date.now() - 24 * ONE_HOUR_MS).toISOString();
        const doc = await createStockIn(storekeeper, [line(pieces, 1), line(kilos, 1)], { supplierUuid: supplier.uuid, date: dayAgo });
        equals(await linesOnDocDate(doc.uuid), 2, "lines on the doc date");

        const hourAgo = new Date(Date.now() - ONE_HOUR_MS).toISOString();
        const { data } = await storekeeper.api.ok<IStockInDetails>("PUT", path(doc.uuid),
            stockInBody([line(pieces, 1), line(kilos, 1)], { supplierUuid: supplier.uuid, date: hourAgo }));
        equals(data.date, hourAgo, "doc date");
        equals(await linesOnDocDate(doc.uuid), 2, "lines on the new doc date");
        await storekeeper.api.ok("DELETE", path(doc.uuid));
    });

    test("only the creator can edit or delete - not the Owner, not another storekeeper", async () => {
        const otherStorekeeper = await createMember(companyA, {
            role: DefaultRole.STOREKEEPER,
            permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.STOREKEEPER]],
            label: "storekeeper-in",
        });
        for (const user of [companyA.owner, otherStorekeeper]) {
            await user.api.rejects("PUT", path(edited.uuid), ErrorCodes.STOCK_IN.NOT_CREATOR, stockInBody([line(editProduct, 9)]));
            await user.api.rejects("DELETE", path(edited.uuid), ErrorCodes.STOCK_IN.NOT_CREATOR);
        }
        await expectStock(db, editProduct.uuid, 0);
    });

    test("delete takes the stock away, then the document is gone", async () => {
        const doc = await createStockIn(storekeeper, [line(pieces, 5)]);
        await expectStock(db, pieces.uuid, 21);
        await storekeeper.api.ok("DELETE", path(doc.uuid));
        await expectStock(db, pieces.uuid, 16);
        await storekeeper.api.rejects("GET", path(doc.uuid), ErrorCodes.STOCK_IN.NOT_FOUND);
        equals(await db.count("stock_in_lines", "stock_in_uuid = $1", [doc.uuid]), 0, "lines left");
    });

    // --- Who may do what ---

    test("Accountant can see but not create, edit or delete", async () => {
        const doc = await createStockIn(storekeeper, [line(pieces, 1)]);
        const { accountant } = companyA;
        await accountant.api.ok("GET", PATHS.STOCK_INS);
        await accountant.api.ok("GET", `${PATHS.STOCK_INS}/summary`);
        await accountant.api.ok("GET", path(doc.uuid));
        await accountant.api.rejects("POST", PATHS.STOCK_INS, ErrorCodes.AUTH.FORBIDDEN, stockInBody([line(pieces, 1)]));
        await accountant.api.rejects("PUT", path(doc.uuid), ErrorCodes.AUTH.FORBIDDEN, stockInBody([line(pieces, 1)]));
        await accountant.api.rejects("DELETE", path(doc.uuid), ErrorCodes.AUTH.FORBIDDEN);
        await expectStock(db, pieces.uuid, 17);
    });

    test("a user without stock-in permissions, no token, and the Platform Owner are refused", async () => {
        await companyA.staff.api.rejects("GET", PATHS.STOCK_INS, ErrorCodes.AUTH.FORBIDDEN);
        await companyA.staff.api.rejects("GET", `${PATHS.STOCK_INS}/summary`, ErrorCodes.AUTH.FORBIDDEN);
        await companyA.staff.api.rejects("GET", path(randomUuid()), ErrorCodes.AUTH.FORBIDDEN);
        await anonymous.rejects("GET", PATHS.STOCK_INS, ErrorCodes.AUTH.UNAUTHORIZED);
        await anonymous.rejects("POST", PATHS.STOCK_INS, ErrorCodes.AUTH.UNAUTHORIZED, stockInBody([line(pieces, 1)]));
        await context.platformOwner.api.rejects("GET", PATHS.STOCK_INS, ErrorCodes.AUTH.FORBIDDEN);
    });

    test("an unknown uuid gives 404, a malformed one 422", async () => {
        const unknown = randomUuid();
        await storekeeper.api.rejects("GET", path(unknown), ErrorCodes.STOCK_IN.NOT_FOUND);
        await storekeeper.api.rejects("PUT", path(unknown), ErrorCodes.STOCK_IN.NOT_FOUND, stockInBody([line(pieces, 1)]));
        await storekeeper.api.rejects("DELETE", path(unknown), ErrorCodes.STOCK_IN.NOT_FOUND);
        await storekeeper.api.rejectsField("GET", path("not-a-uuid"), "uuid");
    });

    test("the other company can't see, edit or delete it", async () => {
        const doc = await createStockIn(storekeeper, [line(pieces, 1)]);
        const ownerOfB = companyB.owner;
        await ownerOfB.api.rejects("GET", path(doc.uuid), ErrorCodes.STOCK_IN.NOT_FOUND);
        await ownerOfB.api.rejects("PUT", path(doc.uuid), ErrorCodes.STOCK_IN.NOT_FOUND, stockInBody([line(productOfB, 1)]));
        await ownerOfB.api.rejects("DELETE", path(doc.uuid), ErrorCodes.STOCK_IN.NOT_FOUND);

        const { data } = await ownerOfB.api.ok<IStockIn[]>("GET", `${PATHS.STOCK_INS}?pageSize=100`);
        isTrue(!data.some((d) => d.uuid === doc.uuid), "company B's list does not show company A's document");
        await expectStock(db, pieces.uuid, 18);
        await expectStock(db, productOfB.uuid, 0);
    });

    // --- List and summary ---

    test("list filters by reason, supplier and date", async () => {
        const query = async (params: string) => (await storekeeper.api.ok<IStockIn[]>("GET", `${PATHS.STOCK_INS}?pageSize=100&${params}`)).data;

        const purchases = await query(`reason=${StockInReason.PURCHASE}`);
        isTrue(purchases.length > 0 && purchases.every((d) => d.reason === StockInReason.PURCHASE), "reason filter shows only purchases");

        const bySupplier = await query(`supplierUuid=${supplier.uuid}`);
        isTrue(bySupplier.length > 0 && bySupplier.every((d) => d.supplier?.uuid === supplier.uuid), "supplier filter");

        const future = new Date(Date.now() + ONE_HOUR_MS).toISOString();
        equals((await query(`dateFrom=${encodeURIComponent(future)}`)).length, 0, "documents after now");
        const past = new Date(Date.now() - ONE_HOUR_MS).toISOString();
        equals((await query(`dateTo=${encodeURIComponent(past)}`)).length, 0, "documents before an hour ago");
    });

    test("paging and the summary match the database", async () => {
        const [row] = await db.query<{ products: number }>(
            `SELECT count(DISTINCT product_uuid)::int AS products
             FROM stock_in_lines WHERE company_uuid = $1`,
            [companyA.uuid],
        );
        const total = await stockInCount();

        const page = await storekeeper.api.ok<IStockIn[]>("GET", `${PATHS.STOCK_INS}?page=2&pageSize=3`);
        matches(page.meta, { page: 2, pageSize: 3, total, totalPages: Math.ceil(total / 3) });
        equals(page.data.length, Math.min(3, total - 3), "items on page 2");

        const { data: summary } = await storekeeper.api.ok<IStockInSummary>("GET", `${PATHS.STOCK_INS}/summary`);
        matches(summary, { documentCount: total, productCount: row.products });

        const { data: purchases } = await storekeeper.api.ok<IStockInSummary>("GET", `${PATHS.STOCK_INS}/summary?reason=${StockInReason.PURCHASE}`);
        const purchaseCount = await db.count("stock_ins", "company_uuid = $1 AND reason = $2", [companyA.uuid, StockInReason.PURCHASE]);
        equals(purchases.documentCount, purchaseCount, "purchase summary count");
    });

    test("an invalid body sent by mistake never reaches the database", async () => {
        const before = await stockInCount();
        await post({ reason: StockInReason.PURCHASE });
        await post({ ...stockInBody([line(pieces, 1)]), reason: 999 });
        equals(await stockInCount(), before, "stock-in count");
    });
});
