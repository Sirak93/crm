import { ErrorCodes, StockInReason, StockOutReason, type IProduct, type IStockInDetails, type IStockOutDetails, type ISupplier } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { matches } from "../../core/Assert";
import { createProduct, createStockIn, createStockOut, createSupplier, KILOS_UNIT, stockInBody } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { expectStock } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

/** decisions.md: with 20 L brought and 15 L returned, a stock-in may go down to 15, not below. */
export default (context: ICompanySideContext) => defineSuite("Stock-in after returns", (test) => {
    const { db, companyA } = context;
    const storekeeper = companyA.storekeeper;
    const path = (uuid: string) => `${PATHS.STOCK_INS}/${uuid}`;

    let beer: IProduct;
    let other: IProduct;
    let s1: ISupplier;
    let s2: ISupplier;
    let purchase: IStockInDetails;
    let returned: IStockOutDetails;

    const beerLine = (quantity: number) => [{ productUuid: beer.uuid, quantity }];

    /** Refused because what S1 brought would drop below the 15 L already returned to it. */
    const expectBelowReturned = async (method: string, url: string, body?: unknown) => {
        const response = await storekeeper.api.rejects(method, url, ErrorCodes.STOCK_IN.BELOW_RETURNED, body);
        matches(response.body.error.meta, {
            supplierName: s1.name,
            products: [{ name: beer.name, measureUnit: KILOS_UNIT, quantity: 15 }],
        });
        await storekeeper.api.ok("GET", path(purchase.uuid));
    };

    test("prepares: S1 brought 20 L of beer, 15 L went back; plenty of beer in stock", async () => {
        [beer, other, s1, s2] = await Promise.all([
            createProduct(storekeeper, { allowsDecimals: true }),
            createProduct(storekeeper, { allowsDecimals: true }),
            createSupplier(companyA.accountant),
            createSupplier(companyA.accountant),
        ]);
        purchase = await createStockIn(storekeeper, beerLine(20), { supplierUuid: s1.uuid });
        // Initial stock, so the plain stock check is never what blocks these edits.
        await createStockIn(storekeeper, beerLine(100));
        returned = await createStockOut(storekeeper, beerLine(15), { reason: StockOutReason.RETURNED, supplierUuid: s1.uuid });
        await expectStock(db, beer.uuid, 105);
    });

    test("edit down above the returned amount is fine (20 → 18)", async () => {
        await storekeeper.api.ok("PUT", path(purchase.uuid), stockInBody(beerLine(18), { supplierUuid: s1.uuid }));
        await expectStock(db, beer.uuid, 103);
    });

    test("edit down to exactly the returned amount is fine (→ 15)", async () => {
        await storekeeper.api.ok("PUT", path(purchase.uuid), stockInBody(beerLine(15), { supplierUuid: s1.uuid }));
        await expectStock(db, beer.uuid, 100);
    });

    test("edit down below the returned amount is refused (→ 10)", async () => {
        await expectBelowReturned("PUT", path(purchase.uuid), stockInBody(beerLine(10), { supplierUuid: s1.uuid }));
        await expectStock(db, beer.uuid, 100);
    });

    test("delete is refused", async () => {
        await expectBelowReturned("DELETE", path(purchase.uuid));
        await expectStock(db, beer.uuid, 100);
    });

    test("changing the supplier is refused - only the old supplier is checked", async () => {
        await expectBelowReturned("PUT", path(purchase.uuid), stockInBody(beerLine(15), { supplierUuid: s2.uuid }));
    });

    test("changing Purchase to another reason is refused", async () => {
        await expectBelowReturned("PUT", path(purchase.uuid), stockInBody(beerLine(15), { reason: StockInReason.OTHER, note: "Moved" }));
        await expectBelowReturned("PUT", path(purchase.uuid), stockInBody(beerLine(15), { reason: StockInReason.INITIAL_STOCK }));
    });

    test("replacing beer with another product is refused", async () => {
        await expectBelowReturned("PUT", path(purchase.uuid), stockInBody([{ productUuid: other.uuid, quantity: 15 }], { supplierUuid: s1.uuid }));
        await expectStock(db, other.uuid, 0);
    });

    test("other changes to the document still work", async () => {
        const { data } = await storekeeper.api.ok<IStockInDetails>("PUT", path(purchase.uuid),
            stockInBody([...beerLine(15), { productUuid: other.uuid, quantity: 3 }], { supplierUuid: s1.uuid, invoiceNumber: "INV-9" }));
        matches(data, { invoiceNumber: "INV-9", productCount: 2 });
        await expectStock(db, other.uuid, 3);
    });

    test("with two stock-ins from S1, one can go while the other covers the returns", async () => {
        const second = await createStockIn(storekeeper, beerLine(10), { supplierUuid: s1.uuid });
        // 25 brought, 15 returned: the 15 L stock-in may now go down to 5.
        await storekeeper.api.ok("PUT", path(purchase.uuid), stockInBody(beerLine(5), { supplierUuid: s1.uuid }));
        await expectBelowReturned("DELETE", path(second.uuid));
        await expectStock(db, beer.uuid, 100);
    });

    test("once the return is deleted, the stock-in can be deleted", async () => {
        await storekeeper.api.ok("DELETE", `${PATHS.STOCK_OUTS}/${returned.uuid}`);
        await storekeeper.api.ok("DELETE", path(purchase.uuid));
        await storekeeper.api.rejects("GET", path(purchase.uuid), ErrorCodes.STOCK_IN.NOT_FOUND);
        await expectStock(db, beer.uuid, 110);
    });
});
