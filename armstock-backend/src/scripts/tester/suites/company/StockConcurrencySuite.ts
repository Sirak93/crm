import { ErrorCodes, StockOutReason, type IProduct, type IStockIn } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isTrue } from "../../core/Assert";
import { createProduct, createStockIn, createSupplier, stockInBody, stockOutBody } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { expectStock } from "../../shared/Stock";
import type { IApiResponse } from "../../interfaces/IApiResponse";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

// A race shows up only sometimes, so each case runs several rounds on a fresh product.
const ROUNDS = 5;
const OK_STATUS = 200;

const statuses = (responses: IApiResponse[]) => responses.map((r) => r.status);
const succeeded = (responses: IApiResponse[]) => responses.filter((r) => r.status === OK_STATUS).length;

/** Every response is either a success or the expected refusal - never a 500 or anything else. */
const onlyOkOr = (responses: IApiResponse[], refusal: { CODE: string; STATUS: number }, label: string) => {
    const unexpected = responses.filter((r) => r.status !== OK_STATUS && r.body?.error?.code !== refusal.CODE);
    isTrue(unexpected.length === 0, `${label}: only success or ${refusal.CODE} (got ${JSON.stringify(unexpected.map((r) => r.body))})`);
};

export default (context: ICompanySideContext) => defineSuite("Two saves at the same time", (test) => {
    const { db, companyA } = context;
    const storekeeper = companyA.storekeeper;
    const line = (product: IProduct, quantity: number) => [{ productUuid: product.uuid, quantity }];

    const freshProduct = async (stock: number): Promise<IProduct> => {
        const product = await createProduct(storekeeper);
        await createStockIn(storekeeper, line(product, stock));
        return product;
    };

    test("two stock-outs that each fit but not together: only one goes through", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const product = await freshProduct(10);
            const responses = await Promise.all([
                storekeeper.api.send("POST", PATHS.STOCK_OUTS, stockOutBody(line(product, 6))),
                companyA.owner.api.send("POST", PATHS.STOCK_OUTS, stockOutBody(line(product, 6))),
            ]);
            onlyOkOr(responses, ErrorCodes.STOCK.NOT_ENOUGH, `round ${round}`);
            equals(succeeded(responses), 1, `round ${round}: successes ${statuses(responses)}`);
            await expectStock(db, product.uuid, 4, `round ${round}: stock`);
        }
    });

    test("many stock-outs at once never take more than the stock", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const product = await freshProduct(10);
            const responses = await Promise.all(Array.from({ length: 6 }, () =>
                storekeeper.api.send("POST", PATHS.STOCK_OUTS, stockOutBody(line(product, 3)))));
            onlyOkOr(responses, ErrorCodes.STOCK.NOT_ENOUGH, `round ${round}`);
            equals(succeeded(responses), 3, `round ${round}: successes`);
            await expectStock(db, product.uuid, 1, `round ${round}: stock`);
        }
    });

    test("a stock-out and deleting the stock-in it needs: only one goes through", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const product = await createProduct(storekeeper);
            const stockIn = await createStockIn(storekeeper, line(product, 10));
            const responses = await Promise.all([
                storekeeper.api.send("POST", PATHS.STOCK_OUTS, stockOutBody(line(product, 6))),
                storekeeper.api.send("DELETE", `${PATHS.STOCK_INS}/${stockIn.uuid}`),
            ]);
            onlyOkOr(responses, ErrorCodes.STOCK.NOT_ENOUGH, `round ${round}`);
            equals(succeeded(responses), 1, `round ${round}: successes ${statuses(responses)}`);
            const [stockOut] = responses;
            await expectStock(db, product.uuid, stockOut.status === OK_STATUS ? 4 : 0, `round ${round}: stock`);
        }
    });

    test("a stock-out and editing the stock-in down: stock never goes below zero", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const product = await createProduct(storekeeper);
            const stockIn = await createStockIn(storekeeper, line(product, 10));
            const responses = await Promise.all([
                storekeeper.api.send("POST", PATHS.STOCK_OUTS, stockOutBody(line(product, 6))),
                storekeeper.api.send("PUT", `${PATHS.STOCK_INS}/${stockIn.uuid}`, stockInBody(line(product, 5))),
            ]);
            onlyOkOr(responses, ErrorCodes.STOCK.NOT_ENOUGH, `round ${round}`);
            equals(succeeded(responses), 1, `round ${round}: successes ${statuses(responses)}`);
            const [stockOut] = responses;
            await expectStock(db, product.uuid, stockOut.status === OK_STATUS ? 4 : 5, `round ${round}: stock`);
        }
    });

    test("two returns that together go over what the supplier brought: only one goes through", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const product = await createProduct(storekeeper);
            const supplier = await createSupplier(companyA.accountant);
            await createStockIn(storekeeper, line(product, 5), { supplierUuid: supplier.uuid });
            await createStockIn(storekeeper, line(product, 50));
            const body = stockOutBody(line(product, 3), { reason: StockOutReason.RETURNED, supplierUuid: supplier.uuid });
            const responses = await Promise.all([
                storekeeper.api.send("POST", PATHS.STOCK_OUTS, body),
                storekeeper.api.send("POST", PATHS.STOCK_OUTS, body),
            ]);
            onlyOkOr(responses, ErrorCodes.STOCK_OUT.RETURN_EXCEEDS_SUPPLIER, `round ${round}`);
            equals(succeeded(responses), 1, `round ${round}: successes ${statuses(responses)}`);
            await expectStock(db, product.uuid, 52, `round ${round}: stock`);
        }
    });

    test("a return and editing its stock-in down below it: only one goes through", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const product = await createProduct(storekeeper);
            const supplier = await createSupplier(companyA.accountant);
            const purchase = await createStockIn(storekeeper, line(product, 5), { supplierUuid: supplier.uuid });
            await createStockIn(storekeeper, line(product, 50));
            const responses = await Promise.all([
                storekeeper.api.send("POST", PATHS.STOCK_OUTS,
                    stockOutBody(line(product, 4), { reason: StockOutReason.RETURNED, supplierUuid: supplier.uuid })),
                storekeeper.api.send("PUT", `${PATHS.STOCK_INS}/${purchase.uuid}`, stockInBody(line(product, 2), { supplierUuid: supplier.uuid })),
            ]);
            const [stockOut, edit] = responses;
            isTrue(stockOut.status === OK_STATUS || stockOut.body?.error?.code === ErrorCodes.STOCK_OUT.RETURN_EXCEEDS_SUPPLIER.CODE,
                `round ${round}: return is a success or "exceeds supplier" (got ${JSON.stringify(stockOut.body)})`);
            isTrue(edit.status === OK_STATUS || edit.body?.error?.code === ErrorCodes.STOCK_IN.BELOW_RETURNED.CODE,
                `round ${round}: edit is a success or "below returned" (got ${JSON.stringify(edit.body)})`);
            equals(succeeded(responses), 1, `round ${round}: successes ${statuses(responses)}`);
            await expectStock(db, product.uuid, stockOut.status === OK_STATUS ? 51 : 52, `round ${round}: stock`);
        }
    });

    test("stock-ins saved at the same time all go through, each with its own number", async () => {
        const product = await createProduct(storekeeper);
        const responses = await Promise.all(Array.from({ length: 8 }, () =>
            storekeeper.api.send<IStockIn>("POST", PATHS.STOCK_INS, stockInBody(line(product, 1)))));
        equals(succeeded(responses), 8, `successes ${statuses(responses)}`);
        const numbers = new Set(responses.map((r) => r.data.number));
        equals(numbers.size, 8, "different numbers");
        await expectStock(db, product.uuid, 8);
    });
});
