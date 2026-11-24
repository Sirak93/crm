import { ErrorCodes, ProductStatus, type IProductCategory } from "armstock-shared";
import { DEFAULT_PRODUCT_CATEGORIES } from "../../../../constants/DefaultProductCategories";
import { defineSuite } from "../../core/Suite";
import { hasExactKeys, matches } from "../../core/Assert";
import { createCategory, createProduct } from "../../shared/Builders";
import { createCompany } from "../../shared/Companies";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

export default (context: ICompanySideContext) => defineSuite("Product categories", (test) => {
    const { db, companyA } = context;
    const { storekeeper } = companyA;
    const path = (uuid: string) => `${PATHS.PRODUCT_CATEGORIES}/${uuid}`;

    test("a new company starts with the default categories, in their list order", async () => {
        const company = await createCompany(context, "Categories");
        const { data } = await company.owner.api.ok<IProductCategory[]>("GET", PATHS.PRODUCT_CATEGORIES);
        matches(data.map((c) => c.name), [...DEFAULT_PRODUCT_CATEGORIES]);
    });

    test("create, with a trimmed name; bad names refused", async () => {
        const name = uniqueName("Category");
        const { data } = await storekeeper.api.ok<IProductCategory>("POST", PATHS.PRODUCT_CATEGORIES, { name: `  ${name} ` });
        hasExactKeys(data, ["uuid", "name"]);
        matches(data, { name });
        await storekeeper.api.rejectsField("POST", PATHS.PRODUCT_CATEGORIES, "name", { name: " " });
        await storekeeper.api.rejectsField("POST", PATHS.PRODUCT_CATEGORIES, "name", { name: "x".repeat(101) });
    });

    test("a name is unique in the company ignoring case; another company may reuse it", async () => {
        const category = await createCategory(storekeeper);
        await storekeeper.api.rejects("POST", PATHS.PRODUCT_CATEGORIES, ErrorCodes.PRODUCT_CATEGORY.NAME_TAKEN, { name: category.name.toUpperCase() });
        await createCategory(context.companyB.storekeeper, { name: category.name });
    });

    test("edit renames it; a taken name is refused, its own name is fine", async () => {
        const [a, b] = [await createCategory(storekeeper), await createCategory(storekeeper)];
        const name = uniqueName("Renamed");
        matches((await storekeeper.api.ok<IProductCategory>("PUT", path(a.uuid), { name })).data, { uuid: a.uuid, name });
        await storekeeper.api.rejects("PUT", path(a.uuid), ErrorCodes.PRODUCT_CATEGORY.NAME_TAKEN, { name: b.name });
        await storekeeper.api.ok("PUT", path(a.uuid), { name: name.toLowerCase() });
    });

    test("delete: refused while a product uses it - archived products too; works when free", async () => {
        const category = await createCategory(storekeeper);
        const product = await createProduct(storekeeper, { body: { categoryUuid: category.uuid } });
        await storekeeper.api.ok("PATCH", `${PATHS.PRODUCTS}/${product.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await storekeeper.api.rejects("DELETE", path(category.uuid), ErrorCodes.PRODUCT_CATEGORY.IN_USE);
        await storekeeper.api.ok("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`);
        await storekeeper.api.ok("DELETE", path(category.uuid));
        await storekeeper.api.rejects("DELETE", path(category.uuid), ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND);
    });

    test("list: every category of the company, oldest first - a new one comes after the defaults", async () => {
        const { data } = await companyA.staff.api.ok<IProductCategory[]>("GET", PATHS.PRODUCT_CATEGORIES);
        const ordered = await db.query<{ name: string }>(
            "SELECT name FROM product_categories WHERE company_uuid = $1 ORDER BY created_at, uuid", [companyA.uuid]);
        matches(data.map((c) => c.name), ordered.map((c) => c.name));
    });

    test("an unknown uuid gives 404, a malformed one 422", async () => {
        await storekeeper.api.rejects("PUT", path(randomUuid()), ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND, { name: uniqueName("X") });
        await storekeeper.api.rejects("DELETE", path(randomUuid()), ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND);
        await storekeeper.api.rejectsField("DELETE", path("nope"), "uuid");
    });
});
