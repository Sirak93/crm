import {
    ProductStatus,
    RecipeStatus,
    SupplierStatus,
    UserStatus,
    type INamedRef,
    type IRecipeOption,
    type IStockLineProduct,
    type IStockOutReceiver,
    type ISupplierOption,
} from "armstock-shared";
import { PICKER_LIMIT } from "../../../../constants/PickerConstants";
import { defineSuite } from "../../core/Suite";
import { equals, hasExactKeys, isTrue, matches } from "../../core/Assert";
import { createNoLoginUser } from "../../shared/Accounts";
import { createProduct, createRecipe, createStockIn, createStockOut, createSupplier, lineOf } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

const PRODUCT_OPTION_KEYS = ["uuid", "name", "code", "status", "measureUnit", "receivedAs"];

/** Pickers are open to every member, so the caller here is Staff - a member with no permissions. */
export default (context: ICompanySideContext) => defineSuite("Options (pickers)", (test) => {
    const { db, companyA } = context;
    const { storekeeper, staff } = companyA;
    const tag = uniqueName("Pick").replace(" ", "");
    const q = encodeURIComponent(tag);
    const get = async <T>(url: string) => (await staff.api.ok<T>("GET", url)).data;
    const names = (items: { name: string }[]) => items.map((item) => item.name);
    const nameOf = (key: string) => `${tag} ${key}`;

    // --- Products ---

    test("prepares products: active, archived with stock, archived at 0, one brought by a supplier", async () => {
        const supplier = await createSupplier(companyA.accountant, { name: nameOf("Supplier") });
        const make = (key: string, body: Record<string, unknown> = {}) =>
            createProduct(storekeeper, { body: { name: nameOf(key), ...body } });
        const [active, withStock, empty, brought] = await Promise.all([
            make("A Active", { code: `${tag}-CODE`, barcode: `${tag}999` }),
            make("B Archived with stock"),
            make("C Archived at zero"),
            make("D Brought"),
        ]);
        await createStockIn(storekeeper, [lineOf(withStock, 2), lineOf(empty, 1)]);
        await createStockIn(storekeeper, [lineOf(brought, 1)], { supplierUuid: supplier.uuid });
        await createStockOut(storekeeper, [lineOf(empty, 1)]);
        for (const archived of [withStock, empty]) {
            await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${archived.uuid}/status`, { status: ProductStatus.ARCHIVED });
        }
        equals(active.status, ProductStatus.ACTIVE, "active product");
    });

    test("products: active only by default, sorted by name; only what a stock line needs", async () => {
        const items = await get<IStockLineProduct[]>(`${PATHS.OPTIONS}/products?search=${q}`);
        matches(names(items), [nameOf("A Active"), nameOf("D Brought")]);
        for (const item of items) hasExactKeys(item, PRODUCT_OPTION_KEYS);
    });

    test("products for a stock-out: archived ones with stock too, never at 0", async () => {
        const items = await get<IStockLineProduct[]>(`${PATHS.OPTIONS}/products?search=${q}&forStockOut=true`);
        matches(names(items), [nameOf("A Active"), nameOf("B Archived with stock"), nameOf("D Brought")]);
        matches(items.find((i) => i.name === nameOf("B Archived with stock")), { status: ProductStatus.ARCHIVED });
    });

    test("products for a return: only what that supplier brought", async () => {
        const [supplier] = await get<ISupplierOption[]>(`${PATHS.OPTIONS}/suppliers?search=${encodeURIComponent(nameOf("Supplier"))}`);
        matches(names(await get<IStockLineProduct[]>(`${PATHS.OPTIONS}/products?suppliedBy=${supplier.uuid}`)), [nameOf("D Brought")]);
    });

    test("products: search by code, exact barcode", async () => {
        matches(names(await get<IStockLineProduct[]>(`${PATHS.OPTIONS}/products?search=${encodeURIComponent(`${tag}-code`)}`)), [nameOf("A Active")]);
        matches(names(await get<IStockLineProduct[]>(`${PATHS.OPTIONS}/products?barcode=${tag}999`)), [nameOf("A Active")]);
        matches(await get(`${PATHS.OPTIONS}/products?barcode=${tag}99`), [], "a partial barcode finds nothing");
    });

    test(`products: at most ${PICKER_LIMIT} - the user narrows with the search`, async () => {
        const many = uniqueName("Many").replace(" ", "");
        await Promise.all(Array.from({ length: PICKER_LIMIT + 1 }, (_, i) =>
            createProduct(storekeeper, { body: { name: `${many} ${String(i).padStart(2, "0")}` } })));
        equals((await get<IStockLineProduct[]>(`${PATHS.OPTIONS}/products?search=${many}`)).length, PICKER_LIMIT, "items");
    });

    test("products: a bad query is refused", async () => {
        await staff.api.rejectsField("GET", `${PATHS.OPTIONS}/products?forStockOut=maybe`, "forStockOut");
        await staff.api.rejectsField("GET", `${PATHS.OPTIONS}/products?suppliedBy=nope`, "suppliedBy");
    });

    // --- Suppliers ---

    test("suppliers: every status by default, active only on request; no tax id, note or contacts", async () => {
        const archived = await createSupplier(companyA.accountant, { name: nameOf("Supplier archived"), taxId: "123", note: "Secret" });
        await companyA.accountant.api.ok("PATCH", `${PATHS.SUPPLIERS}/${archived.uuid}/status`, { status: SupplierStatus.ARCHIVED });

        const all = await get<ISupplierOption[]>(`${PATHS.OPTIONS}/suppliers?search=${q}`);
        matches(names(all), [nameOf("Supplier"), nameOf("Supplier archived")]);
        for (const item of all) hasExactKeys(item, ["uuid", "name", "status"]);
        matches(names(await get<ISupplierOption[]>(`${PATHS.OPTIONS}/suppliers?search=${q}&activeOnly=true`)), [nameOf("Supplier")]);
        await staff.api.rejectsField("GET", `${PATHS.OPTIONS}/suppliers?activeOnly=maybe`, "activeOnly");
    });

    // --- Receivers and roles ---

    test("receivers: every company user, those without login too, active first; no email", async () => {
        const noLogin = await createNoLoginUser(companyA);
        const items = await get<IStockOutReceiver[]>(`${PATHS.OPTIONS}/receivers`);
        equals(items.length, await db.count("users", "company_uuid = $1", [companyA.uuid]), "every user");
        isTrue(items.some((r) => r.uuid === noLogin.uuid), "a user without login is listed");
        for (const item of items) hasExactKeys(item, ["uuid", "name", "position", "status"]);
        const statuses = items.map((r) => r.status);
        matches(statuses, [...statuses].sort((a, b) => a - b), "active, then blocked, then archived");
        isTrue(statuses[0] === UserStatus.ACTIVE, "starts with active users");
    });

    test("recipes: active only, sorted by name, with their lines in order; another company's never", async () => {
        const { owner } = companyA;
        const [first, second] = await Promise.all([createProduct(storekeeper), createProduct(storekeeper, { allowsDecimals: true })]);
        await createRecipe(owner, [lineOf(second, 0.0004), lineOf(first, 1)], { name: nameOf("Recipe B") });
        await createRecipe(owner, [lineOf(first, 2)], { name: nameOf("Recipe A") });
        const archived = await createRecipe(owner, [lineOf(first, 1)], { name: nameOf("Recipe C archived") });
        await owner.api.ok("PATCH", `${PATHS.RECIPES}/${archived.uuid}/status`, { status: RecipeStatus.ARCHIVED });
        const ofB = await createRecipe(context.companyB.owner, [lineOf(await createProduct(context.companyB.storekeeper), 1)],
            { name: nameOf("Recipe of B") });

        const items = await get<IRecipeOption[]>(`${PATHS.OPTIONS}/recipes`);
        const ours = items.filter((r) => r.name.startsWith(tag));
        matches(names(ours), [nameOf("Recipe A"), nameOf("Recipe B")]);
        for (const item of items) hasExactKeys(item, ["uuid", "name", "lines"]);
        matches(ours[1].lines, [
            { product: { uuid: second.uuid, measureUnit: second.measureUnit }, quantity: 0.0004 },
            { product: { uuid: first.uuid }, quantity: 1 },
        ]);
        for (const line of ours[1].lines) hasExactKeys(line.product, PRODUCT_OPTION_KEYS);
        isTrue(!items.some((r) => r.uuid === ofB.uuid), "another company's recipe is not listed");
    });

    test("roles: every role of the company, names only", async () => {
        const items = await get<INamedRef[]>(`${PATHS.OPTIONS}/roles`);
        const ordered = await db.query<{ uuid: string }>("SELECT uuid FROM roles WHERE company_uuid = $1 ORDER BY name", [companyA.uuid]);
        matches(items.map((r) => r.uuid), ordered.map((r) => r.uuid));
        for (const item of items) hasExactKeys(item, ["uuid", "name"]);
    });
});
