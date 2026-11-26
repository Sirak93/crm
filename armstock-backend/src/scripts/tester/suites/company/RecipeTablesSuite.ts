import { RecipeStatus } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { createProduct } from "../../shared/Builders";
import { expectRefused, PG_FOREIGN_KEY_VIOLATION as FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION as UNIQUE_VIOLATION } from "../../shared/DatabaseErrors";
import { PATHS } from "../../shared/Paths";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

/** Recipe tables at the database level - the API comes in the next step. */
export default (context: ICompanySideContext) => defineSuite("Recipe tables", (test) => {
    const { db, companyA, companyB } = context;
    const { storekeeper, owner } = companyA;

    const refused = (sql: string, params: unknown[], code: string, label: string) => expectRefused(db, sql, params, code, label);
    const insertRecipe = async (name: string, createdByUuid = owner.uuid, companyUuid = companyA.uuid) => (await db.query<{ uuid: string; status: number }>(
        "INSERT INTO recipes (company_uuid, name, created_by_uuid) VALUES ($1, $2, $3) RETURNING uuid, status",
        [companyUuid, name, createdByUuid],
    ))[0];
    const insertLine = (recipeUuid: string, productUuid: string, quantity: number, position = 1) => db.query(
        "INSERT INTO recipe_lines (recipe_uuid, company_uuid, product_uuid, position, quantity) VALUES ($1, $2, $3, $4, $5)",
        [recipeUuid, companyA.uuid, productUuid, position, quantity],
    );

    test("a recipe starts Active, and its lines keep 6 decimals", async () => {
        const product = await createProduct(storekeeper);
        const recipe = await insertRecipe("Tables check");
        equals(recipe.status, RecipeStatus.ACTIVE, "status");
        await insertLine(recipe.uuid, product.uuid, 0.000125);
        const [line] = await db.query<{ quantity: string }>("SELECT quantity FROM recipe_lines WHERE recipe_uuid = $1", [recipe.uuid]);
        equals(Number(line.quantity), 0.000125, "quantity");
        await db.query("DELETE FROM recipes WHERE uuid = $1", [recipe.uuid]);
    });

    test("a name is unique per company ignoring case; another company may use it", async () => {
        const recipe = await insertRecipe("Dish Case");
        await refused("INSERT INTO recipes (company_uuid, name, created_by_uuid) VALUES ($1, $2, $3)",
            [companyA.uuid, "dish case", owner.uuid], UNIQUE_VIOLATION, "same name in another case");
        const other = await insertRecipe("Dish Case", companyB.owner.uuid, companyB.uuid);
        await db.query("DELETE FROM recipes WHERE uuid = ANY($1)", [[recipe.uuid, other.uuid]]);
    });

    test("a product appears once per recipe", async () => {
        const product = await createProduct(storekeeper);
        const recipe = await insertRecipe("Once check");
        await insertLine(recipe.uuid, product.uuid, 1);
        await refused("INSERT INTO recipe_lines (recipe_uuid, company_uuid, product_uuid, position, quantity) VALUES ($1, $2, $3, 2, 1)",
            [recipe.uuid, companyA.uuid, product.uuid], UNIQUE_VIOLATION, "same product twice");
        await db.query("DELETE FROM recipes WHERE uuid = $1", [recipe.uuid]);
    });

    test("a product used in a recipe can't be deleted; deleting the recipe removes its lines", async () => {
        const product = await createProduct(storekeeper);
        const recipe = await insertRecipe("Delete check");
        await insertLine(recipe.uuid, product.uuid, 2);
        await refused("DELETE FROM products WHERE uuid = $1", [product.uuid], FOREIGN_KEY_VIOLATION, "product delete");
        await db.query("DELETE FROM recipes WHERE uuid = $1", [recipe.uuid]);
        equals(await db.count("recipe_lines", "recipe_uuid = $1", [recipe.uuid]), 0, "lines left");
        await owner.api.ok("DELETE", `${PATHS.PRODUCTS}/${product.uuid}`);
    });

    test("a user who created a recipe can't be deleted", async () => {
        // A fresh user, so nothing but the recipe points at them.
        const chef = await createMember(companyA, { permissions: [], label: "recipe-creator" });
        const recipe = await insertRecipe("Creator check", chef.uuid);
        await refused("DELETE FROM users WHERE uuid = $1", [chef.uuid], FOREIGN_KEY_VIOLATION, "user delete");
        await db.query("DELETE FROM recipes WHERE uuid = $1", [recipe.uuid]);
    });
});
