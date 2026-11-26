import { API_PATH, DefaultRole, ErrorCodes, Permission } from "armstock-shared";
import type { Router } from "express";
import { defineSuite } from "../../core/Suite";
import { AssertionError, matches } from "../../core/Assert";
import { createMember } from "../../shared/Accounts";
import { createProduct, findCategory } from "../../shared/Builders";
import { COMPANY_ROUTES, routeLabel } from "../../shared/CompanyRoutes";
import { PATHS } from "../../shared/Paths";
import { randomUuid } from "../../shared/Random";
import { HttpMethod } from "../../enums/HttpMethod";
import companyRouter from "../../../../routes/CompanyRoutes";
import optionsRouter from "../../../../routes/OptionsRoutes";
import productCategoryRouter from "../../../../routes/ProductCategoryRoutes";
import productRouter from "../../../../routes/ProductRoutes";
import recipeRouter from "../../../../routes/RecipeRoutes";
import roleRouter from "../../../../routes/RoleRoutes";
import stockInRouter from "../../../../routes/StockInRoutes";
import stockOutRouter from "../../../../routes/StockOutRoutes";
import stockRouter from "../../../../routes/StockRoutes";
import supplierRouter from "../../../../routes/SupplierRoutes";
import type { Http } from "../../core/Http";
import type { ICompanyRoute } from "../../interfaces/ICompanyRoute";
import type { ICompanySideContext } from "../../interfaces/ICompanySideContext";
import type { IOwnRefs } from "../../interfaces/IOwnRefs";
import type { ITestUser } from "../../interfaces/ITestUser";

const SERVER_ERROR_STATUS = 500;

// Mounted as in app.ts - every router a company user calls.
const COMPANY_ROUTERS: [string, Router][] = [
    [`${API_PATH}/company`, companyRouter],
    [`${API_PATH}/options`, optionsRouter],
    [`${API_PATH}/product-categories`, productCategoryRouter],
    [`${API_PATH}/products`, productRouter],
    [`${API_PATH}/recipes`, recipeRouter],
    [`${API_PATH}/roles`, roleRouter],
    [`${API_PATH}/suppliers`, supplierRouter],
    [`${API_PATH}/stock-ins`, stockInRouter],
    [`${API_PATH}/stock-outs`, stockOutRouter],
    [`${API_PATH}/stock`, stockRouter],
];

/** "PUT /api/products/:uuid" for every route the routers really have. */
const mountedRoutes = (): string[] => COMPANY_ROUTERS.flatMap(([base, router]) =>
    (router.stack as { route?: { path: string; methods: Record<string, boolean> } }[])
        .filter((layer) => layer.route)
        .flatMap((layer) => Object.keys(layer.route!.methods).map((method) =>
            `${method.toUpperCase()} ${base}${layer.route!.path === "/" ? "" : layer.route!.path}`)));

const ALL_PERMISSIONS = Object.values(Permission).filter((p): p is Permission => typeof p === "number");

/**
 * Every company route refuses a user who lacks its permission - even one who has all the
 * others - and lets through a user who has only that one. Ids are random and bodies empty or
 * pointing nowhere, so no call changes anything: "let through" means the answer is not
 * "forbidden" (it may be 404 or a validation error).
 */
export default (context: ICompanySideContext) => defineSuite("Permissions", (test) => {
    const { anonymous, companyA } = context;
    const only = new Map<Permission, ITestUser>();
    const allBut = new Map<Permission, ITestUser>();
    let refs: IOwnRefs;

    // GET takes no body; any other route gets its valid body, or an empty one that fails validation.
    const call = (http: Http, route: ICompanyRoute) =>
        http.send(route.method, route.path({ uuid: randomUuid(), contactUuid: randomUuid() }),
            route.method === HttpMethod.GET ? undefined : route.body?.(refs) ?? {});

    const expectLetThrough = async (http: Http, route: ICompanyRoute, who: string) => {
        const response = await call(http, route);
        if (response.body?.error?.code === ErrorCodes.AUTH.FORBIDDEN.CODE || response.status >= SERVER_ERROR_STATUS) {
            throw new AssertionError(`${who} was not let through ${routeLabel(route)}`, "not forbidden, no server error", response.body);
        }
    };

    test("the route table lists every company route, and only those", async () => {
        const inTable = COMPANY_ROUTES.map(routeLabel).sort();
        const mounted = mountedRoutes().sort();
        matches(inTable.filter((r) => !mounted.includes(r)), [], "in the table but not in the app");
        matches(mounted.filter((r) => !inTable.includes(r)), [], "in the app but not in the table");
    });

    test("prepares one user with only each permission and one with all but it", async () => {
        const [category, product] = await Promise.all([findCategory(companyA.owner), createProduct(companyA.storekeeper)]);
        refs = { categoryUuid: category.uuid, productUuid: product.uuid, productUnit: product.measureUnit, roleUuid: companyA.roles[DefaultRole.STAFF] };
        await Promise.all(ALL_PERMISSIONS.flatMap((permission) => [
            createMember(companyA, { permissions: [permission], label: `only-${permission}` }).then((u) => { only.set(permission, u); }),
            createMember(companyA, { permissions: ALL_PERMISSIONS.filter((p) => p !== permission), label: `all-but-${permission}` })
                .then((u) => { allBut.set(permission, u); }),
        ]));
    });

    for (const route of COMPANY_ROUTES) {
        const label = routeLabel(route);
        const { permission } = route;

        if (permission === null) {
            test(`${label} - open to every member, even one with no permissions`, async () => {
                await expectLetThrough(companyA.staff.api, route, "a member with no permissions");
            });
            continue;
        }

        test(`${label} - needs ${Permission[permission]}`, async () => {
            const response = await call(allBut.get(permission)!.api, route);
            matches(response, { status: ErrorCodes.AUTH.FORBIDDEN.STATUS, body: { error: { code: ErrorCodes.AUTH.FORBIDDEN.CODE } } },
                `a user with every permission but ${Permission[permission]}`);
            await expectLetThrough(only.get(permission)!.api, route, `a user with only ${Permission[permission]}`);
        });
    }

    test("the Owner is let through every route", async () => {
        for (const route of COMPANY_ROUTES) await expectLetThrough(companyA.owner.api, route, "the Owner");
    });

    test("no token is refused on every route", async () => {
        for (const route of COMPANY_ROUTES) {
            const response = await call(anonymous, route);
            matches(response.body, { error: { code: ErrorCodes.AUTH.UNAUTHORIZED.CODE } }, routeLabel(route));
        }
    });

    test("the Platform Owner is refused on every company route", async () => {
        for (const route of COMPANY_ROUTES) {
            const response = await call(context.platformOwner.api, route);
            matches(response.body, { error: { code: ErrorCodes.AUTH.FORBIDDEN.CODE } }, routeLabel(route));
        }
    });

    test("turning a permission off works on the next request, without logging in again", async () => {
        const user = await createMember(companyA, { permissions: [Permission.PRODUCT_VIEW], label: "turned-off" });
        await user.api.ok("GET", PATHS.PRODUCTS);
        await companyA.owner.api.ok("PUT", `${PATHS.COMPANY_USERS}/${user.uuid}/access`, { roleUuid: refs.roleUuid, permissions: [] });
        await user.api.rejects("GET", PATHS.PRODUCTS, ErrorCodes.AUTH.FORBIDDEN);
        await companyA.owner.api.ok("PUT", `${PATHS.COMPANY_USERS}/${user.uuid}/access`, {
            roleUuid: refs.roleUuid,
            permissions: [Permission.PRODUCT_VIEW],
        });
        await user.api.ok("GET", PATHS.PRODUCTS);
    });
});
