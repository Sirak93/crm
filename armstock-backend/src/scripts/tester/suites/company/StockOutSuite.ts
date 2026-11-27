import {
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    ProductStatus,
    RecipeStatus,
    StockOutDepartment,
    StockOutReason,
    SupplierStatus,
    type IProduct,
    type IRecipeDetails,
    type IStockOut,
    type IStockOutDetails,
    type IStockOutSummary,
    type ISupplier,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isNull, isTrue, matches } from "../../core/Assert";
import { createMember, createNoLoginUser } from "../../shared/Accounts";
import {
    createProduct,
    createRecipe,
    createStockIn,
    createStockOut,
    createSupplier,
    KILOS_UNIT,
    PIECES_UNIT,
    stockOutBody,
    lineOf,
} from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
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

    const lines = (product: IProduct, quantity: number) => [lineOf(product, quantity)];
    const stockOutCount = async () => db.count("stock_outs", "company_uuid = $1", [companyA.uuid]);

    test("prepares products, a supplier and stock", async () => {
        [pieces, kilos, supplier, productOfB] = await Promise.all([
            createProduct(storekeeper),
            createProduct(storekeeper, { allowsDecimals: true }),
            createSupplier(companyA.accountant),
            createProduct(companyB.storekeeper),
        ]);

        await createStockIn(storekeeper, [lineOf(pieces, 10)], { supplierUuid: supplier.uuid });
        await createStockIn(storekeeper, [lineOf(kilos, 5.5)]);
        await createStockIn(companyB.storekeeper, [lineOf(productOfB, 10)]);
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

    test("each product once in the totals - a second line of it is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines", stockOutBody([lineOf(pieces, 1), lineOf(pieces, 1)]));
        await expectStock(db, pieces.uuid, 4);
    });

    test("only the short products are listed, each with its own amount", async () => {
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH,
            stockOutBody([lineOf(pieces, 1), lineOf(kilos, 4.001)]));
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

    test("a total of 0 is allowed (listed, nothing given); negative totals or extras are refused", async () => {
        const doc = await createStockOut(storekeeper, lines(pieces, 0));
        matches(doc, { productCount: 1, lines: [{ product: { uuid: pieces.uuid }, quantity: 0 }] });
        await expectStock(db, pieces.uuid, 4);
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines.0.quantity", stockOutBody(lines(pieces, -1)));
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "lines.0.extraQuantity",
            stockOutBody([], { lines: [{ productUuid: pieces.uuid, quantity: 1, extraQuantity: -1 }] }));
    });

    test("an extra part with a fraction of a whole-number unit is refused", async () => {
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.PRODUCT.QUANTITY_NOT_WHOLE,
            stockOutBody([], { lines: [{ productUuid: pieces.uuid, quantity: 1, extraQuantity: 0.5 }] }));
    });

    test("an extra part is saved; the department is copied onto the lines (null when not an issue)", async () => {
        const issued = await createStockOut(storekeeper, [], { lines: [{ productUuid: kilos.uuid, quantity: 0.2, extraQuantity: 0.1 }] });
        const damaged = await createStockOut(storekeeper, lines(kilos, 0.1), { reason: StockOutReason.DAMAGED, department: null });
        const rows = await db.query<{ stock_out_uuid: string; quantity: string; extra_quantity: string; department: number | null }>(
            "SELECT stock_out_uuid, quantity, extra_quantity, department FROM stock_out_lines WHERE stock_out_uuid = ANY($1)",
            [[issued.uuid, damaged.uuid]],
        );
        const byDoc = new Map(rows.map((r) => [r.stock_out_uuid, r]));
        matches(byDoc.get(issued.uuid), { quantity: "0.200", extra_quantity: "0.100", department: StockOutDepartment.KITCHEN });
        matches(byDoc.get(damaged.uuid), { extra_quantity: "0.100", department: isNull });
        await storekeeper.api.ok("DELETE", path(issued.uuid));
        await storekeeper.api.ok("DELETE", path(damaged.uuid));
        await expectStock(db, kilos.uuid, 3.745);
    });

    test("an issue goes to the kitchen - another department is refused", async () => {
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "department", stockOutBody(lines(pieces, 1), { department: 999 }));
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
        await createStockIn(storekeeper, [lineOf(pieces, 2)], { supplierUuid: old.uuid });
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

    // --- Recipes ---

    let chef: ITestUser;
    let oil: IProduct;
    let egg: IProduct;
    let salt: IProduct;
    let soup: IRecipeDetails;
    let omelette: IRecipeDetails;
    let byRecipe: IStockOutDetails;

    const recipeRow = (recipe: { uuid: string }, persons: number) => ({ recipeUuid: recipe.uuid, persons });
    const total = (product: IProduct, quantity: number, extraQuantity = 0) => ({ productUuid: product.uuid, quantity, extraQuantity });
    const recipeBody = (recipes: unknown[], totals: unknown[], fields: Record<string, unknown> = {}) =>
        stockOutBody([], { recipes, lines: totals, ...fields });

    test("prepares a head chef, products with stock and two recipes", async () => {
        [chef, oil, egg, salt] = await Promise.all([
            createMember(companyA, { role: DefaultRole.CHEF, permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.CHEF]], label: "out-chef" }),
            createProduct(storekeeper, { allowsDecimals: true }),
            createProduct(storekeeper),
            createProduct(storekeeper, { allowsDecimals: true }),
        ]);
        await createStockIn(storekeeper, [lineOf(oil, 10), lineOf(egg, 100), lineOf(salt, 1)]);
        soup = await createRecipe(chef, [lineOf(oil, 0.05), lineOf(egg, 1)]);
        omelette = await createRecipe(chef, [lineOf(egg, 0.5), lineOf(salt, 0.0004)]);
    });

    test("recipes + extras: recipe rows, a copy with needed amounts, one row per product with its extra part; stock goes down by the totals", async () => {
        const { data: doc } = await storekeeper.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS, recipeBody(
            [recipeRow(soup, 10), recipeRow(omelette, 3)],
            [total(oil, 1, 0.3), total(egg, 12), total(salt, 0.002)],
        ));
        matches(doc, { productCount: 3 });
        byRecipe = doc;

        const rows = await db.query<{ recipe_uuid: string; position: number; persons: number }>(
            "SELECT recipe_uuid, position, persons FROM stock_out_recipes WHERE stock_out_uuid = $1 ORDER BY position", [doc.uuid]);
        matches(rows, [{ recipe_uuid: soup.uuid, position: 1, persons: 10 }, { recipe_uuid: omelette.uuid, position: 2, persons: 3 }]);

        const copied = await db.query<{ recipe_uuid: string; product_uuid: string; position: number; quantity: string; needed_quantity: string }>(
            `SELECT r.recipe_uuid, l.product_uuid, l.position, l.quantity, l.needed_quantity
             FROM stock_out_recipe_lines l JOIN stock_out_recipes r ON r.uuid = l.stock_out_recipe_uuid
             WHERE r.stock_out_uuid = $1 AND l.company_uuid = $2 ORDER BY r.position, l.position`,
            [doc.uuid, companyA.uuid],
        );
        matches(copied.map((l) => [l.product_uuid, l.position, Number(l.quantity), Number(l.needed_quantity)]), [
            [oil.uuid, 1, 0.05, 0.5],
            [egg.uuid, 2, 1, 10],
            [egg.uuid, 1, 0.5, 1.5],
            [salt.uuid, 2, 0.0004, 0.0012],
        ]);

        const saved = await db.query<{ product_uuid: string; quantity: string; extra_quantity: string; department: number }>(
            "SELECT product_uuid, quantity, extra_quantity, department FROM stock_out_lines WHERE stock_out_uuid = $1 ORDER BY position", [doc.uuid]);
        matches(saved.map((l) => [l.product_uuid, Number(l.quantity), Number(l.extra_quantity), l.department]), [
            [oil.uuid, 1, 0.3, StockOutDepartment.KITCHEN],
            [egg.uuid, 12, 0, StockOutDepartment.KITCHEN],
            [salt.uuid, 0.002, 0, StockOutDepartment.KITCHEN],
        ]);

        await expectStock(db, oil.uuid, 9);
        await expectStock(db, egg.uuid, 88);
        await expectStock(db, salt.uuid, 0.998);
    });

    // Expected details of the document above - also after its recipes change.
    const expectedRecipeDetails = () => ({
        hasRecipes: true,
        recipes: [
            {
                recipe: { uuid: soup.uuid },
                persons: 10,
                lines: [
                    { product: { uuid: oil.uuid }, quantity: 0.05, neededQuantity: 0.5 },
                    { product: { uuid: egg.uuid }, quantity: 1, neededQuantity: 10 },
                ],
            },
            {
                recipe: { uuid: omelette.uuid },
                persons: 3,
                lines: [
                    { product: { uuid: egg.uuid }, quantity: 0.5, neededQuantity: 1.5 },
                    { product: { uuid: salt.uuid }, quantity: 0.0004, neededQuantity: 0.0012 },
                ],
            },
        ],
        lines: [
            { product: { uuid: oil.uuid }, quantity: 1, extraQuantity: 0.3, neededQuantity: 0.5 },
            { product: { uuid: egg.uuid }, quantity: 12, extraQuantity: 0, neededQuantity: 11.5 },
            { product: { uuid: salt.uuid }, quantity: 0.002, extraQuantity: 0, neededQuantity: 0.0012 },
        ],
    });

    test("details: recipe rows with their saved lines; per product needed, extra and given", async () => {
        matches(byRecipe, { recipes: [{ recipe: { name: soup.name } }, { recipe: { name: omelette.name } }] });
        matches((await storekeeper.api.ok<IStockOutDetails>("GET", path(byRecipe.uuid))).data, expectedRecipeDetails());
    });

    test("the list marks documents with recipes; a doc without them has none", async () => {
        const plain = await createStockOut(storekeeper, lines(oil, 0.1));
        matches(plain, { hasRecipes: false, recipes: [], lines: [{ extraQuantity: 0.1, neededQuantity: 0 }] });
        const { data } = await storekeeper.api.ok<IStockOut[]>("GET", `${PATHS.STOCK_OUTS}?pageSize=100`);
        matches(data.find((d) => d.uuid === byRecipe.uuid), { hasRecipes: true });
        matches(data.find((d) => d.uuid === plain.uuid), { hasRecipes: false });
        await storekeeper.api.ok("DELETE", path(plain.uuid));
    });

    test("a total may be 0 or below the recipe needs", async () => {
        await storekeeper.api.ok("POST", PATHS.STOCK_OUTS, recipeBody([recipeRow(soup, 10)], [total(oil, 0), total(egg, 4)]));
        await expectStock(db, oil.uuid, 9);
        await expectStock(db, egg.uuid, 84);
    });

    test("recipes only with reason Issued", async () => {
        for (const fields of [
            { reason: StockOutReason.DAMAGED, department: null },
            { reason: StockOutReason.RETURNED, supplierUuid: supplier.uuid },
            { reason: StockOutReason.OTHER, note: "Tasting" },
        ]) {
            await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "recipes",
                recipeBody([recipeRow(soup, 1)], [total(oil, 1), total(egg, 1)], fields));
        }
    });

    test("each recipe once; persons a whole number above 0", async () => {
        const totals = [total(oil, 1), total(egg, 1)];
        await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "recipes", recipeBody([recipeRow(soup, 1), recipeRow(soup, 2)], totals));
        for (const persons of [0, -1, 1.5]) {
            await storekeeper.api.rejectsField("POST", PATHS.STOCK_OUTS, "recipes.0.persons", recipeBody([recipeRow(soup, persons)], totals));
        }
    });

    test("every recipe product needs a line in the totals", async () => {
        const before = await stockOutCount();
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK_OUT.RECIPE_PRODUCT_MISSING,
            recipeBody([recipeRow(soup, 1)], [total(oil, 1)]));
        equals(await stockOutCount(), before, "stock-out count");
    });

    test("an archived recipe is refused; an unknown or another company's recipe is not found", async () => {
        const archived = await createRecipe(chef, [lineOf(oil, 1)]);
        await chef.api.ok("PATCH", `${PATHS.RECIPES}/${archived.uuid}/status`, { status: RecipeStatus.ARCHIVED });
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.RECIPE.ARCHIVED, recipeBody([recipeRow(archived, 1)], [total(oil, 1)]));

        const productOfBRecipe = await createRecipe(companyB.owner, [lineOf(productOfB, 1)]);
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.RECIPE.NOT_FOUND,
            recipeBody([recipeRow(productOfBRecipe, 1)], [total(oil, 1)]));
        await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.RECIPE.NOT_FOUND,
            recipeBody([{ recipeUuid: randomUuid(), persons: 1 }], [total(oil, 1)]));
    });

    test("totals over the stock are refused, with what is available", async () => {
        const response = await storekeeper.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.STOCK.NOT_ENOUGH,
            recipeBody([recipeRow(soup, 1)], [total(oil, 9.001), total(egg, 1)]));
        matches(response.body.error.meta, [{ name: oil.name, available: 9 }]);
        await expectStock(db, oil.uuid, 9);
    });

    test("a recipe used in a stock-out can't be deleted; once the document is gone it can", async () => {
        const used = await createRecipe(chef, [lineOf(oil, 0.1)]);
        const { data: doc } = await storekeeper.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS,
            recipeBody([recipeRow(used, 2)], [total(oil, 0.2)]));
        await chef.api.rejects("DELETE", `${PATHS.RECIPES}/${used.uuid}`, ErrorCodes.RECIPE.IN_USE);

        await storekeeper.api.ok("DELETE", path(doc.uuid));
        equals(await db.count("stock_out_recipes", "stock_out_uuid = $1", [doc.uuid]), 0, "recipe rows left");
        await chef.api.ok("DELETE", `${PATHS.RECIPES}/${used.uuid}`);
        await expectStock(db, oil.uuid, 9);
    });

    test("edit replaces the recipe rows", async () => {
        const { data: doc } = await storekeeper.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS,
            recipeBody([recipeRow(soup, 2)], [total(oil, 0.1), total(egg, 2)]));
        await storekeeper.api.ok("PUT", path(doc.uuid), recipeBody([recipeRow(omelette, 4)], [total(egg, 2), total(salt, 0.002)]));
        const rows = await db.query<{ recipe_uuid: string; persons: number }>(
            "SELECT recipe_uuid, persons FROM stock_out_recipes WHERE stock_out_uuid = $1", [doc.uuid]);
        matches(rows, [{ recipe_uuid: omelette.uuid, persons: 4 }]);
        equals(await db.count("stock_out_recipe_lines", "company_uuid = $1 AND stock_out_recipe_uuid NOT IN (SELECT uuid FROM stock_out_recipes)",
            [companyA.uuid]), 0, "copied lines without a recipe row");
        await storekeeper.api.ok("DELETE", path(doc.uuid));
    });

    test("a recipe edited or archived later leaves the document as it was; the name follows the recipe", async () => {
        const newName = uniqueName("Renamed soup");
        await chef.api.ok("PUT", `${PATHS.RECIPES}/${soup.uuid}`, { name: newName, note: null, lines: [{ productUuid: salt.uuid, quantity: 0.01 }] });
        await chef.api.ok("PATCH", `${PATHS.RECIPES}/${omelette.uuid}/status`, { status: RecipeStatus.ARCHIVED });

        const { data } = await storekeeper.api.ok<IStockOutDetails>("GET", path(byRecipe.uuid));
        matches(data, expectedRecipeDetails());
        matches(data.recipes[0].recipe, { name: newName });
        equals(data.recipes[0].lines.length, 2, "soup lines kept");
    });

    test("edit works from the saved copy: new persons use the old amounts, an archived recipe stays, extras are kept", async () => {
        // Soup now has only salt and omelette is archived (test above); the doc still has their old amounts.
        await storekeeper.api.rejects("PUT", path(byRecipe.uuid), ErrorCodes.STOCK_OUT.RECIPE_PRODUCT_MISSING,
            recipeBody([recipeRow(soup, 20), recipeRow(omelette, 3)], [total(egg, 22), total(salt, 0.002)]));

        const { data } = await storekeeper.api.ok<IStockOutDetails>("PUT", path(byRecipe.uuid), recipeBody(
            [recipeRow(soup, 20), recipeRow(omelette, 3)],
            [total(oil, 1.3, 0.3), total(egg, 22), total(salt, 0.002)],
        ));
        matches(data, {
            recipes: [
                {
                    recipe: { uuid: soup.uuid },
                    persons: 20,
                    lines: [
                        { product: { uuid: oil.uuid }, quantity: 0.05, neededQuantity: 1 },
                        { product: { uuid: egg.uuid }, quantity: 1, neededQuantity: 20 },
                    ],
                },
                expectedRecipeDetails().recipes[1],
            ],
            lines: [
                { product: { uuid: oil.uuid }, quantity: 1.3, extraQuantity: 0.3, neededQuantity: 1 },
                { product: { uuid: egg.uuid }, quantity: 22, extraQuantity: 0, neededQuantity: 21.5 },
                { product: { uuid: salt.uuid }, quantity: 0.002, extraQuantity: 0, neededQuantity: 0.0012 },
            ],
        });
        equals(data.recipes[0].lines.length, 2, "soup copy kept");
        await expectStock(db, oil.uuid, 8.7);
        await expectStock(db, egg.uuid, 74);
    });

    test("a row added on edit uses the current recipe; an archived recipe the doc didn't have is refused", async () => {
        const stew = await createRecipe(chef, [lineOf(oil, 0.1)]);
        const { data: doc } = await storekeeper.api.ok<IStockOutDetails>("POST", PATHS.STOCK_OUTS,
            recipeBody([recipeRow(stew, 1)], [total(oil, 0.1)]));

        await storekeeper.api.rejects("PUT", path(doc.uuid), ErrorCodes.RECIPE.ARCHIVED,
            recipeBody([recipeRow(stew, 1), recipeRow(omelette, 1)], [total(oil, 0.1), total(egg, 1), total(salt, 0.001)]));

        const { data } = await storekeeper.api.ok<IStockOutDetails>("PUT", path(doc.uuid),
            recipeBody([recipeRow(stew, 1), recipeRow(soup, 2)], [total(oil, 0.1), total(salt, 0.02)]));
        matches(data.recipes, [
            { recipe: { uuid: stew.uuid }, lines: [{ product: { uuid: oil.uuid }, quantity: 0.1, neededQuantity: 0.1 }] },
            { recipe: { uuid: soup.uuid }, persons: 2, lines: [{ product: { uuid: salt.uuid }, quantity: 0.01, neededQuantity: 0.02 }] },
        ]);

        await storekeeper.api.ok("DELETE", path(doc.uuid));
        await expectStock(db, oil.uuid, 8.7);
    });

    test("a member without stock-out permissions can't save a doc with recipes", async () => {
        await chef.api.rejects("POST", PATHS.STOCK_OUTS, ErrorCodes.AUTH.FORBIDDEN, recipeBody([recipeRow(soup, 1)], [total(oil, 1), total(egg, 1)]));
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
