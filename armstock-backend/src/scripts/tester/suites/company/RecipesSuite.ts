import {
    DEFAULT_ROLE_PERMISSIONS,
    DefaultRole,
    ErrorCodes,
    ProductStatus,
    RecipeStatus,
    type IRecipe,
    type IRecipeDetails,
} from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { anyDate, equals, hasExactKeys, isNull, matches } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { createProduct, createRecipe, KILOS_UNIT, PIECES_UNIT, recipeBody, lineOf } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import { randomUuid, uniqueName } from "../../shared/Random";
import type { IProduct } from "armstock-shared";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { ITestUser } from "../../interfaces/ITestUser";

const RECIPE_KEYS = ["uuid", "name", "note", "status", "lineCount", "createdAt"];
const LINE_KEYS = ["uuid", "product", "quantity"];

export default (context: ICompanySideContext) => defineSuite("Recipes", (test) => {
    const { db, companyA, companyB } = context;
    const { storekeeper, staff, owner } = companyA;
    const path = (uuid: string) => `${PATHS.RECIPES}/${uuid}`;
    const tag = uniqueName("Rcp").replace(" ", "");
    const line = (product: IProduct, quantity: number) => lineOf(product, quantity);
    const listed = (query: string) => chef.api.ok<IRecipe[]>("GET", `${PATHS.RECIPES}?${query}`);

    let chef: ITestUser;
    let whole: IProduct;
    let decimal: IProduct;

    test("prepares a head chef and two products (whole and decimal units)", async () => {
        [chef, whole, decimal] = await Promise.all([
            createMember(companyA, { role: DefaultRole.CHEF, permissions: [...DEFAULT_ROLE_PERMISSIONS[DefaultRole.CHEF]], label: "chef" }),
            createProduct(storekeeper),
            createProduct(storekeeper, { allowsDecimals: true }),
        ]);
    });

    // --- Create ---

    test("create: saved Active with its lines in order; 3 decimals even for a whole-number unit; empty note as null", async () => {
        const name = `${tag} Soup`;
        const { data } = await chef.api.ok<IRecipeDetails>("POST", PATHS.RECIPES, {
            name: `  ${name} `,
            note: " ",
            lines: [line(whole, 0.125), line(decimal, 0.1)],
        });
        hasExactKeys(data, [...RECIPE_KEYS, "lines"]);
        matches(data, { name, note: isNull, status: RecipeStatus.ACTIVE, lineCount: 2, createdAt: anyDate });
        hasExactKeys(data.lines[0], LINE_KEYS);
        matches(data.lines, [
            { product: { uuid: whole.uuid, name: whole.name, measureUnit: PIECES_UNIT }, quantity: 0.125 },
            { product: { uuid: decimal.uuid, measureUnit: KILOS_UNIT }, quantity: 0.1 },
        ]);
        const [row] = await db.query<{ created_by_uuid: string }>("SELECT created_by_uuid FROM recipes WHERE uuid = $1", [data.uuid]);
        equals(row.created_by_uuid, chef.uuid, "created by");
    });

    test("bad bodies are refused", async () => {
        const post = (field: string, fields: Record<string, unknown>) =>
            chef.api.rejectsField("POST", PATHS.RECIPES, field, recipeBody([line(whole, 1)], fields));
        await post("name", { name: " " });
        await post("name", { name: "x".repeat(201) });
        await post("note", { note: "x".repeat(1001) });
        await post("lines", { lines: [] });
        await post("lines", { lines: undefined });
        await post("lines", { lines: [line(whole, 1), line(whole, 2)] });
        await post("lines.0.quantity", { lines: [line(whole, 0)] });
        await post("lines.0.quantity", { lines: [line(whole, -1)] });
        await post("lines.0.quantity", { lines: [line(whole, 0.0001)] });
        await post("lines.0.productUuid", { lines: [{ productUuid: "nope", quantity: 1 }] });
    });

    test("a name is unique in the company ignoring case - archived recipes count too; another company may reuse it", async () => {
        const recipe = await createRecipe(chef, [line(whole, 1)], { name: uniqueName(tag) });
        await db.query("UPDATE recipes SET status = $1 WHERE uuid = $2", [RecipeStatus.ARCHIVED, recipe.uuid]);
        await chef.api.rejects("POST", PATHS.RECIPES, ErrorCodes.RECIPE.NAME_TAKEN, recipeBody([line(whole, 1)], { name: recipe.name.toUpperCase() }));
        const productB = await createProduct(companyB.storekeeper);
        await createRecipe(companyB.owner, [line(productB, 1)], { name: recipe.name });
    });

    test("products must be the company's and active", async () => {
        const productB = await createProduct(companyB.storekeeper);
        await chef.api.rejects("POST", PATHS.RECIPES, ErrorCodes.PRODUCT.NOT_FOUND, recipeBody([line(productB, 1)]));
        await chef.api.rejects("POST", PATHS.RECIPES, ErrorCodes.PRODUCT.NOT_FOUND, recipeBody([{ productUuid: randomUuid(), measureUnit: PIECES_UNIT, quantity: 1 }]));
        const archived = await createProduct(storekeeper);
        await owner.api.ok("PATCH", `${PATHS.PRODUCTS}/${archived.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await chef.api.rejects("POST", PATHS.RECIPES, ErrorCodes.PRODUCT.ARCHIVED, recipeBody([line(archived, 1)]));
    });

    // --- Edit ---

    test("edit replaces name, note and lines; a taken name is refused; its own name in another case is fine", async () => {
        const recipe = await createRecipe(chef, [line(whole, 1), line(decimal, 2)], { name: uniqueName(tag) });
        const other = await createRecipe(chef, [line(whole, 1)], { name: uniqueName(tag) });
        const name = uniqueName(`${tag} Edited`);
        const { data } = await chef.api.ok<IRecipeDetails>("PUT", path(recipe.uuid), {
            name, note: "Serve hot", lines: [line(decimal, 0.5)],
        });
        matches(data, { uuid: recipe.uuid, name, note: "Serve hot", lineCount: 1, lines: [{ product: { uuid: decimal.uuid }, quantity: 0.5 }] });
        equals(await db.count("recipe_lines", "recipe_uuid = $1", [recipe.uuid]), 1, "lines left");
        await chef.api.rejects("PUT", path(recipe.uuid), ErrorCodes.RECIPE.NAME_TAKEN, recipeBody([line(whole, 1)], { name: other.name.toLowerCase() }));
        await chef.api.ok("PUT", path(recipe.uuid), recipeBody([line(whole, 1)], { name: name.toUpperCase() }));
    });

    test("edit keeps a product archived since it was added, but can't add a new archived one", async () => {
        const kept = await createProduct(storekeeper);
        const recipe = await createRecipe(chef, [line(kept, 1)]);
        await owner.api.ok("PATCH", `${PATHS.PRODUCTS}/${kept.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await chef.api.ok("PUT", path(recipe.uuid), recipeBody([line(kept, 2)], { name: recipe.name }));

        const added = await createProduct(storekeeper);
        await owner.api.ok("PATCH", `${PATHS.PRODUCTS}/${added.uuid}/status`, { status: ProductStatus.ARCHIVED });
        await chef.api.rejects("PUT", path(recipe.uuid), ErrorCodes.PRODUCT.ARCHIVED, recipeBody([line(kept, 2), line(added, 1)], { name: recipe.name }));
    });

    test("unknown recipes are not found", async () => {
        await chef.api.rejects("GET", path(randomUuid()), ErrorCodes.RECIPE.NOT_FOUND);
        await chef.api.rejects("PUT", path(randomUuid()), ErrorCodes.RECIPE.NOT_FOUND, recipeBody([line(whole, 1)]));
    });

    // --- List and details ---

    test("list: sorted by name with line counts; search; status filter; paging; bad query", async () => {
        const make = (suffix: string, lines = [line(whole, 1)]) => createRecipe(chef, lines, { name: `${tag} List ${suffix}` });
        const b = await make("B", [line(whole, 1), line(decimal, 1)]);
        const a = await make("A");
        const c = await make("C");
        await db.query("UPDATE recipes SET status = $1 WHERE uuid = $2", [RecipeStatus.ARCHIVED, c.uuid]);

        const { data, meta } = await listed(`search=${encodeURIComponent(`${tag} List`)}&pageSize=100`);
        hasExactKeys(data[0]!, RECIPE_KEYS);
        matches(data.map((r) => r.uuid), [a.uuid, b.uuid, c.uuid], "order");
        matches(data[1], { lineCount: 2 });
        equals(meta?.total, 3, "total");

        const active = (await listed(`search=${encodeURIComponent(`${tag} List`)}&status=${RecipeStatus.ACTIVE}`)).data;
        matches(active.map((r) => r.uuid), [a.uuid, b.uuid], "active only");
        const archived = (await listed(`search=${encodeURIComponent(`${tag} List`)}&status=${RecipeStatus.ARCHIVED}`)).data;
        matches(archived.map((r) => r.uuid), [c.uuid], "archived only");

        const page2 = await listed(`search=${encodeURIComponent(`${tag} List`)}&pageSize=2&page=2`);
        matches(page2.data.map((r) => r.uuid), [c.uuid], "page 2");
        matches(page2.meta, { page: 2, pageSize: 2, total: 3, totalPages: 2 });

        await chef.api.rejectsField("GET", `${PATHS.RECIPES}?status=999`, "status");
        await chef.api.rejectsField("GET", `${PATHS.RECIPES}?pageSize=1000`, "pageSize");
    });

    test("details: all lines in the order typed", async () => {
        const recipe = await createRecipe(chef, [line(decimal, 3), line(whole, 1)]);
        const { data } = await chef.api.ok<IRecipeDetails>("GET", path(recipe.uuid));
        matches(data, { uuid: recipe.uuid, lineCount: 2, lines: [{ product: { uuid: decimal.uuid }, quantity: 3 }, { product: { uuid: whole.uuid }, quantity: 1 }] });
    });

    // --- Archive, restore, delete ---

    test("archive and back; the list item comes back; bad status refused", async () => {
        const recipe = await createRecipe(chef, [line(whole, 1), line(decimal, 1)]);
        const setStatus = (status: RecipeStatus) => chef.api.ok<IRecipe>("PATCH", `${path(recipe.uuid)}/status`, { status });
        const { data } = await setStatus(RecipeStatus.ARCHIVED);
        hasExactKeys(data, RECIPE_KEYS);
        matches(data, { uuid: recipe.uuid, status: RecipeStatus.ARCHIVED, lineCount: 2 });
        matches((await chef.api.ok<IRecipeDetails>("GET", path(recipe.uuid))).data, { status: RecipeStatus.ARCHIVED, lineCount: 2 });
        matches((await setStatus(RecipeStatus.ACTIVE)).data, { status: RecipeStatus.ACTIVE });
        await chef.api.rejectsField("PATCH", `${path(recipe.uuid)}/status`, "status", { status: 999 });
        await chef.api.rejectsField("PATCH", `${path(recipe.uuid)}/status`, "status", {});
    });

    test("an unused recipe can be deleted - active or archived - with its lines", async () => {
        const recipe = await createRecipe(chef, [line(whole, 1), line(decimal, 1)]);
        await chef.api.ok("DELETE", path(recipe.uuid));
        equals(await db.count("recipes", "uuid = $1", [recipe.uuid]), 0, "recipe left");
        equals(await db.count("recipe_lines", "recipe_uuid = $1", [recipe.uuid]), 0, "lines left");
        await chef.api.rejects("DELETE", path(recipe.uuid), ErrorCodes.RECIPE.NOT_FOUND);

        const archived = await createRecipe(chef, [line(whole, 1)]);
        await chef.api.ok("PATCH", `${path(archived.uuid)}/status`, { status: RecipeStatus.ARCHIVED });
        await chef.api.ok("DELETE", path(archived.uuid));
    });

    test("archive / delete: unknown, malformed or another company's recipe", async () => {
        const productB = await createProduct(companyB.storekeeper);
        const recipeB = await createRecipe(companyB.owner, [line(productB, 1)]);
        for (const uuid of [randomUuid(), recipeB.uuid]) {
            await chef.api.rejects("PATCH", `${path(uuid)}/status`, ErrorCodes.RECIPE.NOT_FOUND, { status: RecipeStatus.ARCHIVED });
            await chef.api.rejects("DELETE", path(uuid), ErrorCodes.RECIPE.NOT_FOUND);
        }
        await chef.api.rejectsField("DELETE", path("nope"), "uuid");
        equals(await db.count("recipes", "uuid = $1 AND status = $2", [recipeB.uuid, RecipeStatus.ACTIVE]), 1, "other company's recipe untouched");
    });

    test("a product used in a recipe can't be deleted (clear error); once the recipe is gone it can", async () => {
        const product = await createProduct(storekeeper);
        const recipe = await createRecipe(chef, [line(product, 1)]);
        await owner.api.rejects("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`, ErrorCodes.PRODUCT.IN_RECIPE);
        await owner.api.ok("PATCH", `${path(recipe.uuid)}/status`, { status: RecipeStatus.ARCHIVED });
        await owner.api.rejects("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`, ErrorCodes.PRODUCT.IN_RECIPE);
        await chef.api.ok("DELETE", path(recipe.uuid));
        await owner.api.ok("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`);
    });

    // --- Access ---

    test("the storekeeper may list and open recipes but not add, edit, archive or delete them; Staff sees nothing", async () => {
        const recipe = await createRecipe(chef, [line(whole, 1)]);
        await storekeeper.api.ok("GET", PATHS.RECIPES);
        await storekeeper.api.ok("GET", path(recipe.uuid));
        await storekeeper.api.rejects("POST", PATHS.RECIPES, ErrorCodes.AUTH.FORBIDDEN, recipeBody([line(whole, 1)]));
        await storekeeper.api.rejects("PUT", path(recipe.uuid), ErrorCodes.AUTH.FORBIDDEN, recipeBody([line(whole, 1)]));
        await storekeeper.api.rejects("PATCH", `${path(recipe.uuid)}/status`, ErrorCodes.AUTH.FORBIDDEN, { status: RecipeStatus.ARCHIVED });
        await storekeeper.api.rejects("DELETE", path(recipe.uuid), ErrorCodes.AUTH.FORBIDDEN);
        await staff.api.rejects("GET", PATHS.RECIPES, ErrorCodes.AUTH.FORBIDDEN);
    });

    test("another company's recipe is not found and its list is empty for us", async () => {
        const productB = await createProduct(companyB.storekeeper);
        const recipeB = await createRecipe(companyB.owner, [line(productB, 1)], { name: `${tag} Other` });
        await chef.api.rejects("GET", path(recipeB.uuid), ErrorCodes.RECIPE.NOT_FOUND);
        equals((await listed(`search=${encodeURIComponent(tag)}&pageSize=100`)).data.some((r) => r.uuid === recipeB.uuid), false, "listed");
    });
});
