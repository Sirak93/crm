import { BARCODE_MAX_LENGTH, ErrorCodes, ProductStatus, type IProduct } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { anyDate, equals, hasExactKeys, isNull, isTrue, matches } from "../../core/Assert";
import { createCategory, createProduct, createStockIn, createStockOut, findCategory, findUnit } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

const PRODUCT_KEYS = ["uuid", "name", "code", "barcode", "status", "measureUnit", "category", "createdAt"];
const NAME_MAX = 200;

export default (context: ICompanySideContext) => defineSuite("Products", (test) => {
    const { db, companyA } = context;
    const storekeeper = companyA.storekeeper;
    const path = (uuid: string) => `${PATHS.PRODUCTS}/${uuid}`;
    const tag = uniqueName("Prod").replace(" ", "");
    const code = (suffix: string) => `${tag}-${suffix}`;

    let unitUuid: string;
    let categoryUuid: string;
    const body = (fields: Record<string, unknown> = {}) => ({ name: uniqueName(tag), categoryUuid, measureUnitUuid: unitUuid, ...fields });
    const editBody = (product: IProduct, fields: Record<string, unknown> = {}) =>
        ({ name: product.name, code: product.code, barcode: product.barcode, categoryUuid: product.category.uuid, ...fields });

    test("prepares a unit and a category", async () => {
        [unitUuid, categoryUuid] = await Promise.all([
            findUnit(storekeeper, true).then((u) => u.uuid),
            findCategory(storekeeper).then((c) => c.uuid),
        ]);
    });

    // --- Create ---

    test("create: saved active, with its unit and category; empty code and barcode stored as null", async () => {
        const name = uniqueName(tag);
        const { data } = await storekeeper.api.ok<IProduct>("POST", PATHS.PRODUCTS, body({ name: `  ${name} `, code: " ", barcode: "" }));
        hasExactKeys(data, PRODUCT_KEYS);
        matches(data, {
            name,
            code: isNull,
            barcode: isNull,
            status: ProductStatus.ACTIVE,
            measureUnit: { uuid: unitUuid, allowsDecimals: true },
            category: { uuid: categoryUuid },
            createdAt: anyDate,
        });
    });

    test("bad bodies are refused", async () => {
        const post = (field: string, fields: Record<string, unknown>) => storekeeper.api.rejectsField("POST", PATHS.PRODUCTS, field, body(fields));
        await post("name", { name: " " });
        await post("name", { name: "x".repeat(NAME_MAX + 1) });
        await post("barcode", { barcode: "1".repeat(BARCODE_MAX_LENGTH + 1) });
        await post("categoryUuid", { categoryUuid: "nope" });
        await post("measureUnitUuid", { measureUnitUuid: undefined });
    });

    test("an unknown unit or category is refused", async () => {
        await storekeeper.api.rejects("POST", PATHS.PRODUCTS, ErrorCodes.MEASURE_UNIT.NOT_FOUND, body({ measureUnitUuid: randomUuid() }));
        await storekeeper.api.rejects("POST", PATHS.PRODUCTS, ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND, body({ categoryUuid: randomUuid() }));
    });

    test("code is unique in the company ignoring case; barcode is unique; another company may reuse both", async () => {
        const first = await createProduct(storekeeper, { body: { code: code("A"), barcode: `${tag}111` } });
        await storekeeper.api.rejects("POST", PATHS.PRODUCTS, ErrorCodes.PRODUCT.CODE_TAKEN, body({ code: code("a") }));
        await storekeeper.api.rejects("POST", PATHS.PRODUCTS, ErrorCodes.PRODUCT.BARCODE_TAKEN, body({ barcode: first.barcode }));
        await createProduct(context.companyB.storekeeper, { body: { code: code("A"), barcode: first.barcode } });
        // Two products without a code or barcode are fine.
        await createProduct(storekeeper);
        await createProduct(storekeeper);
    });

    // --- Edit ---

    test("edit changes name, code, barcode and category - never the unit", async () => {
        const product = await createProduct(storekeeper, { body: { code: code("E1") } });
        const otherCategory = await createCategory(storekeeper);
        const otherUnit = await findUnit(storekeeper, false);
        const { data } = await storekeeper.api.ok<IProduct>("PUT", path(product.uuid), {
            ...editBody(product, { name: `${tag} Edited`, code: code("E2"), barcode: `${tag}222`, categoryUuid: otherCategory.uuid }),
            measureUnitUuid: otherUnit.uuid,
        });
        matches(data, {
            name: `${tag} Edited`,
            code: code("E2"),
            barcode: `${tag}222`,
            category: { uuid: otherCategory.uuid },
            measureUnit: { uuid: product.measureUnit.uuid },
        });
    });

    test("edit: a code or barcode used by another product is refused; keeping its own is fine", async () => {
        const a = await createProduct(storekeeper, { body: { code: code("K1"), barcode: `${tag}333` } });
        const b = await createProduct(storekeeper);
        await storekeeper.api.rejects("PUT", path(b.uuid), ErrorCodes.PRODUCT.CODE_TAKEN, editBody(b, { code: code("k1") }));
        await storekeeper.api.rejects("PUT", path(b.uuid), ErrorCodes.PRODUCT.BARCODE_TAKEN, editBody(b, { barcode: a.barcode }));
        await storekeeper.api.ok("PUT", path(a.uuid), editBody(a, { name: `${tag} Same code` }));
    });

    test("edit to an unknown category is refused", async () => {
        const product = await createProduct(storekeeper);
        await storekeeper.api.rejects("PUT", path(product.uuid), ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND, editBody(product, { categoryUuid: randomUuid() }));
    });

    // --- Archive and delete ---

    test("archive and back", async () => {
        const product = await createProduct(storekeeper);
        const setStatus = (status: ProductStatus) => storekeeper.api.ok<IProduct>("PATCH", `${path(product.uuid)}/status`, { status });
        matches((await setStatus(ProductStatus.ARCHIVED)).data, { status: ProductStatus.ARCHIVED, category: { uuid: categoryUuid } });
        matches((await setStatus(ProductStatus.ACTIVE)).data, { status: ProductStatus.ACTIVE });
        await storekeeper.api.rejectsField("PATCH", `${path(product.uuid)}/status`, "status", { status: 999 });
    });

    test("an unused product can be deleted", async () => {
        const product = await createProduct(storekeeper);
        await storekeeper.api.ok("DELETE", path(product.uuid));
        equals(await db.count("products", "uuid = $1", [product.uuid]), 0, "rows left");
        await storekeeper.api.rejects("DELETE", path(product.uuid), ErrorCodes.PRODUCT.NOT_FOUND);
    });

    test("a product used in a stock-in or a stock-out can't be deleted - even after its documents net to 0", async () => {
        const product = await createProduct(storekeeper);
        await createStockIn(storekeeper, [{ productUuid: product.uuid, quantity: 2 }]);
        await storekeeper.api.rejects("DELETE", path(product.uuid), ErrorCodes.PRODUCT.IN_USE);
        await createStockOut(storekeeper, [{ productUuid: product.uuid, quantity: 2 }]);
        await storekeeper.api.rejects("DELETE", path(product.uuid), ErrorCodes.PRODUCT.IN_USE);
        equals(await db.count("products", "uuid = $1", [product.uuid]), 1, "still there");
    });

    // --- List ---

    test("list: sorted by name; filters by search (name or code), barcode, category and status", async () => {
        const category = await createCategory(storekeeper);
        const [alpha, beta] = [
            await createProduct(storekeeper, { body: { name: `${tag} Alpha`, code: code("ALPHA"), barcode: `${tag}444`, categoryUuid: category.uuid } }),
            await createProduct(storekeeper, { body: { name: `${tag} Beta`, categoryUuid: category.uuid } }),
        ];
        await storekeeper.api.ok("PATCH", `${path(beta.uuid)}/status`, { status: ProductStatus.ARCHIVED });
        const uuids = async (params: string) =>
            (await storekeeper.api.ok<IProduct[]>("GET", `${PATHS.PRODUCTS}?pageSize=100&${params}`)).data.map((p) => p.uuid);

        matches(await uuids(`categoryUuid=${category.uuid}`), [alpha.uuid, beta.uuid], "category, sorted by name");
        matches(await uuids(`categoryUuid=${category.uuid}&status=${ProductStatus.ARCHIVED}`), [beta.uuid], "status");
        matches(await uuids(`search=${encodeURIComponent(code("alpha"))}`), [alpha.uuid], "search by code");
        matches(await uuids(`search=${encodeURIComponent(`${tag} bet`)}`), [beta.uuid], "search by name");
        matches(await uuids(`barcode=${alpha.barcode}`), [alpha.uuid], "barcode");
        matches(await uuids(`barcode=${alpha.barcode!.slice(0, -1)}`), [], "barcode is an exact match");
    });

    test("paging, and a bad query", async () => {
        const total = await db.count("products", "company_uuid = $1", [companyA.uuid]);
        const { data, meta } = await storekeeper.api.ok<IProduct[]>("GET", `${PATHS.PRODUCTS}?page=2&pageSize=10`);
        matches(meta, { page: 2, pageSize: 10, total, totalPages: Math.ceil(total / 10) });
        equals(data.length, Math.min(10, total - 10), "items on page 2");
        isTrue(data.every((p) => Object.keys(p).length === PRODUCT_KEYS.length), "list items have the same shape");
        await storekeeper.api.rejectsField("GET", `${PATHS.PRODUCTS}?status=999`, "status");
        await storekeeper.api.rejectsField("GET", `${PATHS.PRODUCTS}?pageSize=0`, "pageSize");
    });

    test("an unknown uuid gives 404, a malformed one 422", async () => {
        const unknown = randomUuid();
        await storekeeper.api.rejects("PUT", path(unknown), ErrorCodes.PRODUCT.NOT_FOUND, { name: tag, categoryUuid });
        await storekeeper.api.rejects("PATCH", `${path(unknown)}/status`, ErrorCodes.PRODUCT.NOT_FOUND, { status: ProductStatus.ACTIVE });
        await storekeeper.api.rejectsField("DELETE", path("nope"), "uuid");
    });
});
