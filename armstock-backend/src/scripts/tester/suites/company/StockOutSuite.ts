import {
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    ProductStatus,
    StockOutDepartment,
    StockOutReason,
    SupplierStatus,
    type IProduct,
    type IStockOut,
    type IStockOutDetails,
    type IStockOutSummary,
    type ISupplier,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isNull, isTrue, matches } from "../../core/Assert";
import { createMember, createNoLoginUser } from "../../shared/Accounts";
import { createProduct, createStockIn, createStockOut, createSupplier, KILOS_UNIT, PIECES_UNIT, stockOutBody } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid } from "../../shared/Random";
import { expectStock, stockOf } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestUser } from "../../interfaces/ITestUser";

const NUMBER_FORMAT = /^OUT-\d{4}-\d{4}$/;
const ONE_HOUR_MS = 60 * 60 * 1000;

export default (context: ICompanySideContext) => defineSuite("Stock-out", (test) => {
    const { db, anonymous, companyA, companyB } = context;
    const storekeeper = companyA.storekeeper;
    const path = (uuid: string) => `${PATHS.STOCK_OUTS}/${uuid}`;

    // Filled by the first case, used by the rest.
    let pieces: IProduct;
    let kilos: IProduct;
    let supplier: ISupplier;
    let productOfB: IProduct;

    const lines = (product: IProduct, quantity: number) => [{ productUuid: product.uuid, quantity }];
    const stockOutCount = async () => db.count("stock_outs", "company_uuid = $1", [companyA.uuid]);

    test("prepares products, a supplier and stock", async () => {
        [pieces, kilos, supplier, productOfB] = await Promise.all([
            createProduct(storekeeper),
            createProduct(storekeeper, { allowsDecimals: true }),
            createSupplier(companyA.accountant),
            createProduct(companyB.storekeeper),
        ]);

        await createStockIn(storekeeper, [{ productUuid: pieces.uuid, quantity: 10 }], { supplierUuid: supplier.uuid });
        await createStockIn(storekeeper, [{ productUuid: kilos.uuid, quantity: 5.5 }]);
        await createStockIn(companyB.storekeeper, [{ productUuid: productOfB.uuid, quantity: 10 }]);
        await expectStock(db, pieces.uuid, 10);
        await expectStock(db, kilos.uuid, 5.5);
    });

    // --- Rules per reason ---

    test("issue to the kitchen: saved with its lines, stock goes down", async () => {
        const doc = await createStockOut(storekeeper, lines(pieces, 3));
        matches(doc, {
            reason: StockOutReason.ISSUED,
            department: StockOutDepartment.KITCHEN,
            supplier: isNull,
            receiver: isNull,
            productCount: 1,
            createdBy: { uuid: storekeeper.uuid },
            lines: [{ product: { uuid: pieces.uuid, measureUnit: PIECES_UNIT }, quantity: 3 }],
        });
        isTrue(NUMBER_FORMAT.test(doc.number), `number "${doc.number}" has the OUT-YYYY-NNNN form`);
        await expectStock(db, pieces.uuid, 7);
    });

    test("issue can name a receiver, also one without login", async () => {
        const receiver = await createNoLoginUser(companyA);
        const doc = await createStockOut(storekeeper, lines(pieces, 1), { receiverUuid: receiver.uuid });
        matches(doc, { receiver: { uuid: receiver.uuid } });
        await expectStock(db, pieces.uuid, 6);
    });

    test("issue without a department is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "department", stockOutBody(lines(pieces, 1), { department: null }));
    });

    test("return without a supplier is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "supplierUuid",
            stockOutBody(lines(pieces, 1), { reason: StockOutReason.RETURNED }));
    });

    test("Other needs a note", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "note", stockOutBody(lines(pieces, 1), { reason: StockOutReason.OTHER }));
        const doc = await createStockOut(storekeeper, lines(pieces, 1), { reason: StockOutReason.OTHER, note: "Tasting" });
        matches(doc, { reason: StockOutReason.OTHER, note: "Tasting" });
        await expectStock(db, pieces.uuid, 5);
    });

    test("Damaged and Expired need no extra fields", async () => {
        await createStockOut(storekeeper, lines(kilos, 0.5), { reason: StockOutReason.DAMAGED, department: null });
        await createStockOut(storekeeper, lines(kilos, 0.5), { reason: StockOutReason.EXPIRED, department: null });
        await expectStock(db, kilos.uuid, 4.5);
    });

    test("fields that don't belong to the reason are dropped", async () => {
        const receiver = await createNoLoginUser(companyA);
        const doc = await createStockOut(storekeeper, lines(kilos, 0.5), {
            reason: StockOutReason.DAMAGED,
            supplierUuid: supplier.uuid,
            receiverUuid: receiver.uuid,
        });
        matches(doc, { supplier: isNull, department: isNull, receiver: isNull });
        await expectStock(db, kilos.uuid, 4);
    });

    test("return to a supplier keeps the supplier, stock goes down", async () => {
        const doc = await createStockOut(storekeeper, lines(pieces, 1), { reason: StockOutReason.RETURNED, supplierUuid: supplier.uuid });
        matches(doc, { reason: StockOutReason.RETURNED, supplier: { uuid: supplier.uuid, name: supplier.name }, department: isNull });
        await expectStock(db, pieces.uuid, 4);
    });

    // --- Not enough stock ---

    test("more than in stock: refused with what is available, nothing saved", async () => {
        const before = await stockOutCount();
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH, stockOutBody(lines(pieces, 5)));
        matches(response.body.error.meta, [{ name: pieces.name, measureUnit: PIECES_UNIT, available: 4 }]);
        equals(await stockOutCount(), before, "stock-out count");
        await expectStock(db, pieces.uuid, 4);
    });

    test("the same product on two lines counts together", async () => {
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH,
            stockOutBody([{ productUuid: pieces.uuid, quantity: 3 }, { productUuid: pieces.uuid, quantity: 2 }]));
        matches(response.body.error.meta, [{ name: pieces.name, available: 4 }]);
        await expectStock(db, pieces.uuid, 4);
    });

    test("only the short products are listed, each with its own amount", async () => {
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH,
            stockOutBody([{ productUuid: pieces.uuid, quantity: 1 }, { productUuid: kilos.uuid, quantity: 4.001 }]));
        matches(response.body.error.meta, [{ name: kilos.name, measureUnit: KILOS_UNIT, available: 4 }]);
        await expectStock(db, pieces.uuid, 4);
    });

    test("a product with no stock at all shows 0 available", async () => {
        const empty = await createProduct(storekeeper);
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH, stockOutBody(lines(empty, 1)));
        matches(response.body.error.meta, [{ name: empty.name, available: 0 }]);
    });

    // --- Quantities, dates, lines ---

    test("a whole-number unit refuses a fraction", async () => {
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.PRODUCT.QUANTITY_NOT_WHOLE, stockOutBody(lines(pieces, 0.5)));
    });

    test("a decimal unit takes up to 3 decimals, not 4", async () => {
        await createStockOut(storekeeper, lines(kilos, 0.255));
        await expectStock(db, kilos.uuid, 3.745);
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines.0.quantity", stockOutBody(lines(kilos, 0.2555)));
    });

    test("zero or negative quantity is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines.0.quantity", stockOutBody(lines(pieces, 0)));
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines.0.quantity", stockOutBody(lines(pieces, -1)));
    });

    test("a date in the future is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "date",
            stockOutBody(lines(pieces, 1), { date: new Date(Date.now() + ONE_HOUR_MS).toISOString() }));
    });

    test("a document without lines is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines", stockOutBody([]));
    });

    // --- References ---

    test("a product of another company is refused", async () => {
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.PRODUCT.NOT_FOUND, stockOutBody(lines(productOfB, 1)));
        await expectStock(db, productOfB.uuid, 10);
    });

    test("a supplier of another company is refused", async () => {
        const supplierOfB = await createSupplier(companyB.accountant);
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.SUPPLIER.NOT_FOUND,
            stockOutBody(lines(pieces, 1), { reason: StockOutReason.RETURNED, supplierUuid: supplierOfB.uuid }));
    });

    test("a receiver of another company is refused", async () => {
        const receiverOfB = await createNoLoginUser(companyB);
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.USER.NOT_FOUND,
            stockOutBody(lines(pieces, 1), { receiverUuid: receiverOfB.uuid }));
    });

    test("an archived supplier is refused on a new return, but an old return keeps it on edit", async () => {
        const old = await createSupplier(companyA.accountant);
        await createStockIn(storekeeper, [{ productUuid: pieces.uuid, quantity: 2 }], { supplierUuid: old.uuid });
        const doc = await createStockOut(storekeeper, lines(pieces, 1), { reason: StockOutReason.RETURNED, supplierUuid: old.uuid });
        await companyA.accountant.api.ok("PATCH", `${PATHS.SUPPLIERS}/${old.uuid}/status`, { status: SupplierStatus.ARCHIVED });

        const returnBody = stockOutBody(lines(pieces, 1), { reason: StockOutReason.RETURNED, supplierUuid: old.uuid });
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.SUPPLIER.ARCHIVED, returnBody);
        await storekeeper.api.ok("PUT", path(doc.uuid), returnBody);
        await expectStock(db, pieces.uuid, 5);
    });

    test("an archived product that still has stock can go out", async () => {
        const archived = await createProduct(storekeeper);
        await createStockIn(storekeeper, lines(archived, 2));
        await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${archived.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await createStockOut(storekeeper, lines(archived, 2));
        await expectStock(db, archived.uuid, 0);
    });

    // --- Edit and delete ---

    let edited: IStockOutDetails;
    let editProduct: IProduct;

    test("the creator can edit; the document's own quantity counts as available", async () => {
        editProduct = await createProduct(storekeeper);
        await createStockIn(storekeeper, lines(editProduct, 10));
        edited = await createStockOut(storekeeper, lines(editProduct, 4));
        await expectStock(db, editProduct.uuid, 6);

        await storekeeper.api.ok("PUT", path(edited.uuid), stockOutBody(lines(editProduct, 10)));
        await expectStock(db, editProduct.uuid, 0);

        const response = await storekeeper.api.rejects("PUT", path(edited.uuid), ErrorCodes.STOCK.NOT_ENOUGH, stockOutBody(lines(editProduct, 11)));
        matches(response.body.error.meta, [{ name: editProduct.name, available: 10 }]);
        await expectStock(db, editProduct.uuid, 0);
    });

    test("edit replaces the lines and the header", async () => {
        const { data } = await storekeeper.api.ok<IStockOutDetails>("PUT", path(edited.uuid),
            stockOutBody([...lines(editProduct, 2), ...lines(kilos, 0.745)], { reason: StockOutReason.EXPIRED, department: null }));
        matches(data, {
            uuid: edited.uuid,
            number: edited.number,
            reason: StockOutReason.EXPIRED,
            department: isNull,
            productCount: 2,
            lines: [{ product: { uuid: editProduct.uuid }, quantity: 2 }, { product: { uuid: kilos.uuid }, quantity: 0.745 }],
        });
        await expectStock(db, editProduct.uuid, 8);
        await expectStock(db, kilos.uuid, 3);
    });

    test("only the creator can edit or delete - not the Owner, not another storekeeper", async () => {
        const otherStorekeeper = await createMember(companyA, {
            role: DefaultRole.STOREKEEPER,
            permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.STOREKEEPER]],
            label: "storekeeper-2",
        });
        for (const user of [companyA.owner, otherStorekeeper]) {
            await user.api.rejects("PUT", path(edited.uuid), ErrorCodes.STOCK_OUT.NOT_CREATOR, stockOutBody(lines(editProduct, 1)));
            await user.api.rejects("DELETE", path(edited.uuid), ErrorCodes.STOCK_OUT.NOT_CREATOR);
        }
        await expectStock(db, editProduct.uuid, 8);
    });

    test("delete gives the stock back, then the document is gone", async () => {
        await storekeeper.api.ok("DELETE", path(edited.uuid));
        await expectStock(db, editProduct.uuid, 10);
        await expectStock(db, kilos.uuid, 3.745);
        await storekeeper.api.rejects("GET", path(edited.uuid), ErrorCodes.STOCK_OUT.NOT_FOUND);
        equals(await db.count("stock_out_lines", "stock_out_uuid = $1", [edited.uuid]), 0, "lines left");
    });

    // --- Who may do what ---

    test("Accountant can see but not create, edit or delete", async () => {
        const doc = await createStockOut(storekeeper, lines(editProduct, 1));
        const { accountant } = companyA;
        await accountant.api.ok("GET", PATHS.STOCK_OUTS);
        await accountant.api.ok("GET", `${PATHS.STOCK_OUTS}/summary`);
        await accountant.api.ok("GET", path(doc.uuid));
        await accountant.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.AUTH.FORBIDDEN, stockOutBody(lines(editProduct, 1)));
        await accountant.api.rejects("PUT", path(doc.uuid), ErrorCodes.AUTH.FORBIDDEN, stockOutBody(lines(editProduct, 1)));
        await accountant.api.rejects("DELETE", path(doc.uuid), ErrorCodes.AUTH.FORBIDDEN);
        await expectStock(db, editProduct.uuid, 9);
    });

    test("a user without stock-out permissions can't even see the list", async () => {
        const { staff } = companyA;
        await staff.api.rejects("GET", PATHS.STOCK_OUTS, ErrorCodes.AUTH.FORBIDDEN);
        await staff.api.rejects("GET", `${PATHS.STOCK_OUTS}/summary`, ErrorCodes.AUTH.FORBIDDEN);
        await staff.api.rejects("GET", path(randomUuid()), ErrorCodes.AUTH.FORBIDDEN);
    });

    test("no token is refused", async () => {
        await anonymous.rejects("GET", PATHS.STOCK_OUTS, ErrorCodes.AUTH.UNAUTHORIZED);
        await anonymous.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.AUTH.UNAUTHORIZED, stockOutBody(lines(pieces, 1)));
    });

    test("the Platform Owner is not a company user", async () => {
        await context.platformOwner.api.rejects("GET", PATHS.STOCK_OUTS, ErrorCodes.AUTH.FORBIDDEN);
    });

    test("an unknown uuid gives 404 on get, edit and delete", async () => {
        const unknown = randomUuid();
        await storekeeper.api.rejects("GET", path(unknown), ErrorCodes.STOCK_OUT.NOT_FOUND);
        await storekeeper.api.rejects("PUT", path(unknown), ErrorCodes.STOCK_OUT.NOT_FOUND, stockOutBody(lines(pieces, 1)));
        await storekeeper.api.rejects("DELETE", path(unknown), ErrorCodes.STOCK_OUT.NOT_FOUND);
    });

    test("a malformed uuid is refused", async () => {
        await storekeeper.api.rejectsField("GET", path("not-a-uuid"), "uuid");
    });

    test("the other company can't see, edit or delete it", async () => {
        const doc = await createStockOut(storekeeper, lines(editProduct, 1));
        const ownerOfB: ITestUser = companyB.owner;
        await ownerOfB.api.rejects("GET", path(doc.uuid), ErrorCodes.STOCK_OUT.NOT_FOUND);
        await ownerOfB.api.rejects("PUT", path(doc.uuid), ErrorCodes.STOCK_OUT.NOT_FOUND, stockOutBody(lines(productOfB, 1)));
        await ownerOfB.api.rejects("DELETE", path(doc.uuid), ErrorCodes.STOCK_OUT.NOT_FOUND);

        const { data } = await ownerOfB.api.ok<IStockOut[]>("GET", `${PATHS.STOCK_OUTS}?pageSize=100`);
        isTrue(!data.some((d) => d.uuid === doc.uuid), "company B's list does not show company A's document");
        await expectStock(db, editProduct.uuid, 8);
        await expectStock(db, productOfB.uuid, 10);
    });

    // --- List and summary ---

    test("list filters by reason, supplier, receiver and date", async () => {
        const receiver = await createNoLoginUser(companyA);
        const issued = await createStockOut(storekeeper, lines(editProduct, 1), { receiverUuid: receiver.uuid });
        const query = async (params: string) => (await storekeeper.api.ok<IStockOut[]>("GET", `${PATHS.STOCK_OUTS}?pageSize=100&${params}`)).data;

        const returns = await query(`reason=${StockOutReason.RETURNED}`);
        isTrue(returns.length > 0 && returns.every((d) => d.reason === StockOutReason.RETURNED), "reason filter shows only returns");

        const bySupplier = await query(`supplierUuid=${supplier.uuid}`);
        isTrue(bySupplier.length > 0 && bySupplier.every((d) => d.supplier?.uuid === supplier.uuid), "supplier filter");

        const byReceiver = await query(`receiverUuid=${receiver.uuid}`);
        matches(byReceiver.map((d) => d.uuid), [issued.uuid], "receiver filter");

        const future = new Date(Date.now() + ONE_HOUR_MS).toISOString();
        equals((await query(`dateFrom=${encodeURIComponent(future)}`)).length, 0, "documents after now");
    });

    test("paging and the summary match the database", async () => {
        const [{ count }] = await db.query<{ count: number }>(
            `SELECT count(DISTINCT line.product_uuid)::int AS count
             FROM stock_out_lines line WHERE line.company_uuid = $1`,
            [companyA.uuid],
        );
        const total = await stockOutCount();

        const page = await storekeeper.api.ok<IStockOut[]>("GET", `${PATHS.STOCK_OUTS}?page=2&pageSize=3`);
        matches(page.meta, { page: 2, pageSize: 3, total, totalPages: Math.ceil(total / 3) });
        equals(page.data.length, Math.min(3, total - 3), "items on page 2");

        const { data: summary } = await storekeeper.api.ok<IStockOutSummary>("GET", `${PATHS.STOCK_OUTS}/summary`);
        matches(summary, { documentCount: total, productCount: count });
    });

    test("stock in the database matches what the documents add up to", async () => {
        equals(await stockOf(db, pieces.uuid), 5, "pieces");
        equals(await stockOf(db, kilos.uuid), 3.745, "kilos");
    });
});
