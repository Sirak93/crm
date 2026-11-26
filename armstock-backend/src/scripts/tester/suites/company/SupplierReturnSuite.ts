import { ErrorCodes, StockOutReason, type IProduct, type IStockOutDetails, type ISupplier } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { matches } from "../../core/Assert";
import { createProduct, createStockIn, createStockOut, createSupplier, KILOS_UNIT, stockOutBody, lineOf } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { expectStock } from "../../shared/Stock";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

/** The examples from decisions.md: S1 brought 20 L of beer and 5 L were returned. */
export default (context: ICompanySideContext) => defineSuite("Returns to a supplier", (test) => {
    const { db, companyA } = context;
    const storekeeper = companyA.storekeeper;
    const path = (uuid: string) => `${PATHS.STOCK_OUTS}/${uuid}`;

    let beer: IProduct;
    let neverBrought: IProduct;
    let s1: ISupplier;
    let s2: ISupplier;
    let lastReturn: IStockOutDetails;

    const returnTo = (supplier: ISupplier, product: IProduct, quantity: number) =>
        stockOutBody([lineOf(product, quantity)], { reason: StockOutReason.RETURNED, supplierUuid: supplier.uuid });

    /** Refused because the supplier can't take that much back; `canReturn` is what is still returnable. */
    const expectRefused = async (method: string, url: string, supplier: ISupplier, product: IProduct, quantity: number, canReturn: number) => {
        const response = await storekeeper.api.rejects(method, url, ErrorCodes.STOCK_OUT.RETURN_EXCEEDS_SUPPLIER, returnTo(supplier, product, quantity));
        matches(response.body.error.meta, {
            supplierName: supplier.name,
            products: [{ name: product.name, measureUnit: KILOS_UNIT, quantity: canReturn }],
        });
    };

    test("prepares: S1 brought 20 L of beer, 5 L went back; plenty of beer in stock", async () => {
        [beer, neverBrought, s1, s2] = await Promise.all([
            createProduct(storekeeper, { allowsDecimals: true }),
            createProduct(storekeeper, { allowsDecimals: true }),
            createSupplier(companyA.accountant),
            createSupplier(companyA.accountant),
        ]);
        await createStockIn(storekeeper, [lineOf(beer, 20)], { supplierUuid: s1.uuid });
        // Initial stock, so the plain stock check is never what blocks these returns.
        await createStockIn(storekeeper, [lineOf(beer, 100), lineOf(neverBrought, 50)]);
        await createStockOut(storekeeper, [lineOf(beer, 5)], { reason: StockOutReason.RETURNED, supplierUuid: s1.uuid });
        await expectStock(db, beer.uuid, 115);
    });

    test("returning more than it brought is refused: can return 15 L", async () => {
        await expectRefused("POST", PATHS.STOCK_OUTS, s1, beer, 25, 15);
        await expectStock(db, beer.uuid, 115);
    });

    test("returning within what it brought is fine", async () => {
        lastReturn = (await storekeeper.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS, returnTo(s1, beer, 10))).data;
        await expectStock(db, beer.uuid, 105);
    });

    test("a product it never brought is refused: can return 0", async () => {
        await expectRefused("POST", PATHS.STOCK_OUTS, s1, neverBrought, 1, 0);
        await expectStock(db, neverBrought.uuid, 50);
    });

    test("two returns that together go over: the second is refused", async () => {
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, returnTo(s1, beer, 3));
        await expectRefused("POST", PATHS.STOCK_OUTS, s1, beer, 3, 2);
        await expectStock(db, beer.uuid, 102);
    });

    test("editing a return doesn't count itself", async () => {
        // 20 brought, 18 returned (5 + 10 + 3); the 10 L return may grow to 12, not 13.
        await storekeeper.api.ok("PUT", path(lastReturn.uuid), returnTo(s1, beer, 12));
        await expectStock(db, beer.uuid, 100);
        await expectRefused("PUT", path(lastReturn.uuid), s1, beer, 13, 12);
        await expectStock(db, beer.uuid, 100);
    });

    test("each supplier is counted on its own", async () => {
        await expectRefused("POST", PATHS.STOCK_OUTS, s2, beer, 1, 0);
        await createStockIn(storekeeper, [lineOf(beer, 4)], { supplierUuid: s2.uuid });
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, returnTo(s2, beer, 4));
        await expectRefused("POST", PATHS.STOCK_OUTS, s1, beer, 1, 0);
        await expectStock(db, beer.uuid, 100);
    });

    test("changing a return to another reason frees what it returned", async () => {
        await storekeeper.api.ok("PUT", path(lastReturn.uuid), stockOutBody([lineOf(beer, 12)]));
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, returnTo(s1, beer, 12));
        await expectRefused("POST", PATHS.STOCK_OUTS, s1, beer, 1, 0);
        await expectStock(db, beer.uuid, 88);
    });

    test("deleting a return frees what it returned", async () => {
        await storekeeper.api.ok("DELETE", path(lastReturn.uuid));
        await expectStock(db, beer.uuid, 100);
        await expectRefused("POST", PATHS.STOCK_OUTS, s1, beer, 1, 0);
    });

    test("a return the supplier allows still needs the stock", async () => {
        const s3 = await createSupplier(companyA.accountant);
        const wine = await createProduct(storekeeper, { allowsDecimals: true });
        await createStockIn(storekeeper, [lineOf(wine, 10)], { supplierUuid: s3.uuid });
        await createStockOut(storekeeper, [lineOf(wine, 8)]);

        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH, returnTo(s3, wine, 5));
        matches(response.body.error.meta, [{ name: wine.name, available: 2 }]);
        await expectStock(db, wine.uuid, 2);
    });
});
