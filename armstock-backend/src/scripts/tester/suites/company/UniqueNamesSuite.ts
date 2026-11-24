import { ErrorCodes, type IRole } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { equals, isTrue } from "../../core/Assert";
import { createCategory, createProduct, createSupplier, createUnit } from "../../shared/Builders";
import { expectRefused, PG_UNIQUE_VIOLATION } from "../../shared/DatabaseErrors";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";

// A race shows up only sometimes, so it runs several rounds.
const ROUNDS = 5;
const OK_STATUS = 200;

/** Names (and product codes) are unique per company ignoring case - in the database, not only in the services. */
export default (context: ICompanySideContext) => defineSuite("Unique names in the database", (test) => {
    const { db, companyA, companyB } = context;
    const { owner } = companyA;

    /** Renames row `uuid` straight in the database to `value` and expects a unique refusal. */
    const clash = (table: string, column: string, uuid: string, value: string) => expectRefused(db,
        `UPDATE ${table} SET ${column} = $1 WHERE uuid = $2`, [value, uuid], PG_UNIQUE_VIOLATION, `${table}.${column}`);

    test("suppliers, categories, units, product codes and roles refuse the same name in another case", async () => {
        const supplierName = uniqueName("Supplier");
        const [, supplier] = await Promise.all([createSupplier(owner, { name: supplierName }), createSupplier(owner)]);
        await clash("suppliers", "name", supplier.uuid, supplierName.toUpperCase());

        const categoryName = uniqueName("Category");
        const [, category] = await Promise.all([createCategory(owner, { name: categoryName }), createCategory(owner)]);
        await clash("product_categories", "name", category.uuid, categoryName.toUpperCase());

        const unitA = await createUnit(owner);
        const unitB = await createUnit(owner);
        await clash("measure_units", "name", unitB.uuid, unitA.name.toUpperCase());
        await clash("measure_units", "short_name", unitB.uuid, unitA.shortName.toUpperCase());

        const code = uniqueName("code");
        const [, product] = await Promise.all([createProduct(owner, { body: { code } }), createProduct(owner)]);
        await clash("products", "code", product.uuid, code.toUpperCase());

        const roleName = uniqueName("Role");
        await owner.api.ok<IRole>("POST", PATHS.ROLES, { name: roleName, permissions: [] });
        const { data: role } = await owner.api.ok<IRole>("POST", PATHS.ROLES, { name: uniqueName("Role"), permissions: [] });
        await clash("roles", "name", role.uuid, roleName.toUpperCase());
    });

    test("products without a code never clash", async () => {
        await Promise.all([createProduct(owner, { body: { code: null } }), createProduct(owner, { body: { code: null } })]);
    });

    test("another company may use the same names", async () => {
        const name = uniqueName("Shared");
        await Promise.all([createSupplier(owner, { name }), createSupplier(companyB.owner, { name })]);
        await Promise.all([createCategory(owner, { name }), createCategory(companyB.owner, { name })]);
        await Promise.all([
            owner.api.ok("POST", PATHS.ROLES, { name, permissions: [] }),
            companyB.owner.api.ok("POST", PATHS.ROLES, { name, permissions: [] }),
        ]);
    });

    test("two saves of the same name at the same moment: one goes through, the other gets 'name taken' - never a 500", async () => {
        for (let round = 0; round < ROUNDS; round++) {
            const name = uniqueName("Race");
            const responses = await Promise.all([
                owner.api.send("POST", PATHS.SUPPLIERS, { name }),
                owner.api.send("POST", PATHS.SUPPLIERS, { name: name.toUpperCase() }),
            ]);
            equals(responses.filter((r) => r.status === OK_STATUS).length, 1, `round ${round}: saved`);
            const refused = responses.find((r) => r.status !== OK_STATUS);
            isTrue(refused?.body?.error?.code === ErrorCodes.SUPPLIER.NAME_TAKEN.CODE,
                `round ${round}: refusal is NAME_TAKEN (got ${JSON.stringify(refused?.body)})`);
        }
    });
});
