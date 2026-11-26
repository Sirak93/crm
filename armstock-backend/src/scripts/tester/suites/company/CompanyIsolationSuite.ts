import { DefaultRole, ErrorCodes, ProductReceivedAs, type IProduct, type IRecipeDetails, type IRole, type IStockInDetails, type IStockOutDetails, type ISupplier, type ISupplierContact } from "armstock-shared";
import { defineSuite } from "../../core/Suite";
import { AssertionError, matches } from "../../core/Assert";
import { createNoLoginUser } from "../../shared/Accounts";
import {
    createCategory,
    createContact,
    createProduct,
    createRecipe,
    createStockIn,
    createStockOut,
    createSupplier,
    findCategory,
    lineOf,
    PIECES_UNIT,
} from "../../shared/Builders";
import { COMPANY_ROUTES, TARGET_NOT_FOUND, routeLabel } from "../../shared/CompanyRoutes";
import { companySnapshot } from "../../shared/CompanySnapshot";
import { PATHS } from "../../shared/Paths";
import { uniqueName } from "../../shared/Random";
import { HttpMethod } from "../../enums/HttpMethod";
import { RouteTarget } from "../../enums/RouteTarget";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { IOwnRefs } from "../../interfaces/IOwnRefs";
import type { IRouteIds } from "../../interfaces/IRouteIds";

/**
 * Company A's Owner - who has every permission - calls every company route with company B's
 * real ids and a valid body. Each call must answer "not found", and nothing of B may change.
 */
export default (context: ICompanySideContext) => defineSuite("Company isolation", (test) => {
    const { db, companyA, companyB } = context;
    const ownerA = companyA.owner;

    let refs: IOwnRefs;
    let idsOfB: Record<RouteTarget, IRouteIds>;
    let uuidsOfB: string[];
    let snapshotBefore: Record<string, string>;
    let productB: IProduct;
    let supplierB: ISupplier;
    let roleB: IRole;
    let receiverB: string;
    let categoryB: string;

    test("prepares one of everything in company B", async () => {
        const [storekeeperB, accountantB] = [companyB.storekeeper, companyB.accountant];
        let contactB: ISupplierContact;
        let stockInB: IStockInDetails;
        let stockOutB: IStockOutDetails;

        [productB, supplierB, categoryB, roleB, receiverB] = await Promise.all([
            createProduct(storekeeperB),
            createSupplier(accountantB),
            createCategory(storekeeperB).then((c) => c.uuid),
            companyB.owner.api.ok<IRole>("POST", PATHS.ROLES, { name: uniqueName("Role"), permissions: [] }).then((r) => r.data),
            createNoLoginUser(companyB).then((u) => u.uuid),
        ]);
        contactB = await createContact(accountantB, supplierB.uuid);
        stockInB = await createStockIn(storekeeperB, [lineOf(productB, 10)], { supplierUuid: supplierB.uuid });
        stockOutB = await createStockOut(storekeeperB, [lineOf(productB, 2)], { receiverUuid: receiverB });
        const recipeB: IRecipeDetails = await createRecipe(companyB.owner, [lineOf(productB, 0.1)]);

        const [categoryA, productA] = await Promise.all([findCategory(ownerA), createProduct(companyA.storekeeper)]);
        refs = { categoryUuid: categoryA.uuid, productUuid: productA.uuid, productUnit: productA.measureUnit, roleUuid: companyA.roles[DefaultRole.STAFF] };

        const one = (uuid: string): IRouteIds => ({ uuid, contactUuid: contactB.uuid });
        idsOfB = {
            [RouteTarget.PRODUCT]: one(productB.uuid),
            [RouteTarget.SUPPLIER]: one(supplierB.uuid),
            [RouteTarget.SUPPLIER_CONTACT]: one(supplierB.uuid),
            [RouteTarget.PRODUCT_CATEGORY]: one(categoryB),
            [RouteTarget.ROLE]: one(roleB.uuid),
            [RouteTarget.USER]: one(companyB.staff.uuid),
            [RouteTarget.STOCK_IN]: one(stockInB.uuid),
            [RouteTarget.STOCK_OUT]: one(stockOutB.uuid),
            [RouteTarget.RECIPE]: one(recipeB.uuid),
        };
        uuidsOfB = [
            companyB.uuid, productB.uuid, supplierB.uuid, contactB.uuid, categoryB, roleB.uuid, receiverB,
            stockInB.uuid, stockOutB.uuid, recipeB.uuid,
            ...[companyB.owner, companyB.storekeeper, companyB.accountant, companyB.staff].map((u) => u.uuid),
        ];
        snapshotBefore = await companySnapshot(db, companyB.uuid);
    });

    // --- Every route with a uuid ---

    for (const route of COMPANY_ROUTES.filter((r) => r.target !== undefined)) {
        const target = route.target!;
        test(`${routeLabel(route)} with company B's ids - not found`, async () => {
            await ownerA.api.rejects(route.method, route.path(idsOfB[target]), TARGET_NOT_FOUND[target], route.body?.(refs));
        });
    }

    test("company A's supplier with company B's contact - not found", async () => {
        const supplierA = await createSupplier(companyA.accountant);
        const contactPath = `${PATHS.SUPPLIERS}/${supplierA.uuid}/contacts/${idsOfB[RouteTarget.SUPPLIER_CONTACT].contactUuid}`;
        await ownerA.api.rejects(HttpMethod.PUT, contactPath, ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND, { name: "Tester" });
        await ownerA.api.rejects(HttpMethod.DELETE, contactPath, ErrorCodes.SUPPLIER_CONTACT.NOT_FOUND);
    });

    // --- Lists never show company B ---

    test("no list or picker shows anything of company B", async () => {
        for (const route of COMPANY_ROUTES.filter((r) => r.method === HttpMethod.GET && r.target === undefined)) {
            const { body } = await ownerA.api.ok(HttpMethod.GET, `${route.path({ uuid: "", contactUuid: "" })}?pageSize=100`);
            const text = JSON.stringify(body);
            const leaked = uuidsOfB.filter((uuid) => text.includes(uuid));
            if (leaked.length) throw new AssertionError(`${routeLabel(route)} shows company B's records`, [], leaked);
        }
    });

    test("filtering by company B's records finds nothing", async () => {
        const name = encodeURIComponent(productB.name);
        const empty = [
            `${PATHS.PRODUCTS}?search=${name}`,
            `${PATHS.PRODUCTS}?categoryUuid=${categoryB}`,
            `${PATHS.SUPPLIERS}?search=${encodeURIComponent(supplierB.name)}`,
            `${PATHS.STOCK_BALANCE}?search=${name}&inStockOnly=false`,
            `${PATHS.STOCK_INS}?supplierUuid=${supplierB.uuid}`,
            `${PATHS.STOCK_OUTS}?receiverUuid=${receiverB}`,
            `${PATHS.COMPANY_USERS}?roleUuid=${roleB.uuid}`,
            `${PATHS.OPTIONS}/products?search=${name}`,
            `${PATHS.OPTIONS}/products?suppliedBy=${supplierB.uuid}`,
            `${PATHS.OPTIONS}/suppliers?search=${encodeURIComponent(supplierB.name)}`,
        ];
        for (const url of empty) matches((await ownerA.api.ok(HttpMethod.GET, url)).data, [], url);

        for (const url of [`${PATHS.STOCK_INS}/summary?supplierUuid=${supplierB.uuid}`, `${PATHS.STOCK_OUTS}/summary?receiverUuid=${receiverB}`]) {
            matches((await ownerA.api.ok(HttpMethod.GET, url)).data, { documentCount: 0, productCount: 0 }, url);
        }
    });

    // --- Company B's records can't be used in company A's bodies ---

    test("a product can't use company B's category", async () => {
        await ownerA.api.rejects(HttpMethod.POST, PATHS.PRODUCTS, ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND,
            { name: uniqueName("Product"), categoryUuid: categoryB, measureUnit: PIECES_UNIT });
        await ownerA.api.rejects(HttpMethod.PUT, `${PATHS.PRODUCTS}/${refs.productUuid}`, ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND,
            { name: uniqueName("Product"), categoryUuid: categoryB, receivedAs: ProductReceivedAs.LOOSE });
    });

    test("a user can't get company B's role", async () => {
        await ownerA.api.rejects(HttpMethod.POST, PATHS.COMPANY_USERS, ErrorCodes.ROLE.NOT_FOUND,
            { firstName: "Tester", lastName: "Isolation", canLogIn: false, roleUuid: roleB.uuid });
        await ownerA.api.rejects(HttpMethod.PUT, `${PATHS.COMPANY_USERS}/${companyA.staff.uuid}/access`, ErrorCodes.ROLE.NOT_FOUND,
            { roleUuid: roleB.uuid, permissions: [] });
    });

    test("nothing of company B changed", async () => {
        matches(await companySnapshot(db, companyB.uuid), snapshotBefore);
    });
});
