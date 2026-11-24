import { RecipeStatus } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isTrue } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { createProduct } from "../../shared/Builders";
import { PATHS } from "../../shared/Paths";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/** Recipe tables at the database level - the API comes in the next step. */
export default (context: ICompanySideContext) => defineSuite("Recipe tables", (test) => {
    const { db, companyA } = context;
    const { storekeeper, owner } = companyA;

    /** Runs `sql` and expects Postgres to refuse it with `code`. */
    const refused = async (sql: string, params: unknown[], code: string, label: string) => {
        try {
            await db.query(sql, params);
        } catch (error) {
            const found = (error as { code?: string; driverError?: { code?: string } });
            equals(found.code ?? found.driverError?.code, code, label);
            return;
        }
        isTrue(false, `${label}: expected the database to refuse it`);
    };
    const insertRecipe = async (name: string, createdByUuid = owner.uuid) => (await db.query<{ uuid: string; status: number }>(
        "INSERT INTO recipes (company_uuid, name, created_by_uuid) VALUES ($1, $2, $3) RETURNING uuid, status",
        [companyA.uuid, name, createdByUuid],
    ))[0];
    const insertLine = (recipeUuid: string, productUuid: string, quantity: number, position = 1) => db.query(
        "INSERT INTO recipe_lines (recipe_uuid, company_uuid, product_uuid, position, quantity) VALUES ($1, $2, $3, $4, $5)",
        [recipeUuid, companyA.uuid, productUuid, position, quantity],
    );

    test("a recipe starts Active, and its lines keep 3 decimals", async () => {
        const product = await createProduct(storekeeper);
        const recipe = await insertRecipe("Tables check");
        equals(recipe.status, RecipeStatus.ACTIVE, "status");
        await insertLine(recipe.uuid, product.uuid, 0.125);
        const [line] = await db.query<{ quantity: string }>("SELECT quantity FROM recipe_lines WHERE recipe_uuid = $1", [recipe.uuid]);
        equals(Number(line.quantity), 0.125, "quantity");
        await db.query("DELETE FROM recipes WHERE uuid = $1", [recipe.uuid]);
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
