import { ErrorCodes, Permission, ProductReceivedAs, ProductStatus, RecipeStatus, SupplierStatus, UserStatus } from "armstock-shared";
import { HttpMethod } from "../enums/HttpMethod";
import { RouteTarget } from "../enums/RouteTarget";
import { recipeBody, stockInBody, stockOutBody } from "./Builders";
import { PATHS } from "./Paths";
import type { ICompanyRoute } from "../interfaces/ICompanyRoute";
import type { IOwnRefs } from "../interfaces/IOwnRefs";

/**
 * Every company route - the ones a company Owner or member calls. The permission and
 * company-isolation suites both loop over this table, so a new route is added here once.
 */

const { GET, POST, PUT, PATCH, DELETE } = HttpMethod;
const P = Permission;
const T = RouteTarget;

const NAME = "Tester name";
const line = (refs: IOwnRefs) => [{ productUuid: refs.productUuid, measureUnit: refs.productUnit, quantity: 1 }];

export const COMPANY_ROUTES: ICompanyRoute[] = [
    // Company users
    { method: GET, path: () => PATHS.COMPANY_USERS, permission: P.USER_VIEW },
    { method: GET, path: () => `${PATHS.COMPANY_USERS}/summary`, permission: P.USER_VIEW },
    { method: POST, path: () => PATHS.COMPANY_USERS, permission: P.USER_ADD },
    {
        method: PUT, path: (ids) => `${PATHS.COMPANY_USERS}/${ids.uuid}`, permission: P.USER_EDIT, target: T.USER,
        body: () => ({ firstName: NAME, lastName: NAME, canLogIn: false }),
    },
    {
        method: PUT, path: (ids) => `${PATHS.COMPANY_USERS}/${ids.uuid}/access`, permission: P.MANAGE_USER_PERMISSIONS, target: T.USER,
        body: (refs) => ({ roleUuid: refs.roleUuid, permissions: [] }),
    },
    {
        method: PATCH, path: (ids) => `${PATHS.COMPANY_USERS}/${ids.uuid}/status`, permission: P.USER_EDIT, target: T.USER,
        body: () => ({ status: UserStatus.BLOCKED }),
    },

    // Roles - all of them need MANAGE_USER_PERMISSIONS
    { method: GET, path: () => PATHS.ROLES, permission: P.MANAGE_USER_PERMISSIONS },
    { method: POST, path: () => PATHS.ROLES, permission: P.MANAGE_USER_PERMISSIONS },
    {
        method: PUT, path: (ids) => `${PATHS.ROLES}/${ids.uuid}`, permission: P.MANAGE_USER_PERMISSIONS, target: T.ROLE,
        body: () => ({ name: NAME, permissions: [] }),
    },
    { method: DELETE, path: (ids) => `${PATHS.ROLES}/${ids.uuid}`, permission: P.MANAGE_USER_PERMISSIONS, target: T.ROLE },

    // Product categories - every member reads them
    { method: GET, path: () => PATHS.PRODUCT_CATEGORIES, permission: null },
    { method: POST, path: () => PATHS.PRODUCT_CATEGORIES, permission: P.PRODUCT_CATEGORY_ADD },
    {
        method: PUT, path: (ids) => `${PATHS.PRODUCT_CATEGORIES}/${ids.uuid}`, permission: P.PRODUCT_CATEGORY_EDIT, target: T.PRODUCT_CATEGORY,
        body: () => ({ name: NAME }),
    },
    {
        method: DELETE, path: (ids) => `${PATHS.PRODUCT_CATEGORIES}/${ids.uuid}`, permission: P.PRODUCT_CATEGORY_DELETE,
        target: T.PRODUCT_CATEGORY,
    },

    // Products
    { method: GET, path: () => PATHS.PRODUCTS, permission: P.PRODUCT_VIEW },
    { method: POST, path: () => PATHS.PRODUCTS, permission: P.PRODUCT_ADD },
    {
        method: PUT, path: (ids) => `${PATHS.PRODUCTS}/${ids.uuid}`, permission: P.PRODUCT_EDIT, target: T.PRODUCT,
        body: (refs) => ({ name: NAME, categoryUuid: refs.categoryUuid, receivedAs: ProductReceivedAs.LOOSE }),
    },
    {
        method: PATCH, path: (ids) => `${PATHS.PRODUCTS}/${ids.uuid}/status`, permission: P.PRODUCT_ARCHIVE, target: T.PRODUCT,
        body: () => ({ status: ProductStatus.ARCHIVED }),
    },
    { method: DELETE, path: (ids) => `${PATHS.PRODUCTS}/${ids.uuid}`, permission: P.PRODUCT_DELETE, target: T.PRODUCT },

    // Suppliers and their contacts
    { method: GET, path: () => PATHS.SUPPLIERS, permission: P.SUPPLIER_VIEW },
    { method: POST, path: () => PATHS.SUPPLIERS, permission: P.SUPPLIER_ADD },
    {
        method: PUT, path: (ids) => `${PATHS.SUPPLIERS}/${ids.uuid}`, permission: P.SUPPLIER_EDIT, target: T.SUPPLIER,
        body: () => ({ name: NAME }),
    },
    {
        method: PATCH, path: (ids) => `${PATHS.SUPPLIERS}/${ids.uuid}/status`, permission: P.SUPPLIER_ARCHIVE, target: T.SUPPLIER,
        body: () => ({ status: SupplierStatus.ARCHIVED }),
    },
    { method: DELETE, path: (ids) => `${PATHS.SUPPLIERS}/${ids.uuid}`, permission: P.SUPPLIER_DELETE, target: T.SUPPLIER },
    {
        method: POST, path: (ids) => `${PATHS.SUPPLIERS}/${ids.uuid}/contacts`, permission: P.SUPPLIER_CONTACT_ADD, target: T.SUPPLIER,
        body: () => ({ name: NAME }),
    },
    {
        method: PUT, path: (ids) => `${PATHS.SUPPLIERS}/${ids.uuid}/contacts/${ids.contactUuid}`, permission: P.SUPPLIER_CONTACT_EDIT,
        target: T.SUPPLIER_CONTACT, body: () => ({ name: NAME }),
    },
    {
        method: DELETE, path: (ids) => `${PATHS.SUPPLIERS}/${ids.uuid}/contacts/${ids.contactUuid}`, permission: P.SUPPLIER_CONTACT_DELETE,
        target: T.SUPPLIER_CONTACT,
    },

    // Stock
    { method: GET, path: () => PATHS.STOCK_BALANCE, permission: P.STOCK_BALANCE_VIEW },
    { method: GET, path: () => `${PATHS.STOCK_BALANCE}/summary`, permission: P.STOCK_BALANCE_VIEW },
    { method: GET, path: () => PATHS.STOCK_MOVEMENT, permission: P.STOCK_BALANCE_VIEW },
    { method: GET, path: () => PATHS.KITCHEN_BALANCE, permission: P.STOCK_BALANCE_VIEW },

    { method: GET, path: () => PATHS.STOCK_INS, permission: P.STOCK_IN_VIEW },
    { method: GET, path: () => `${PATHS.STOCK_INS}/summary`, permission: P.STOCK_IN_VIEW },
    { method: GET, path: (ids) => `${PATHS.STOCK_INS}/${ids.uuid}`, permission: P.STOCK_IN_VIEW, target: T.STOCK_IN },
    { method: POST, path: () => PATHS.STOCK_INS, permission: P.STOCK_IN_CREATE },
    {
        method: PUT, path: (ids) => `${PATHS.STOCK_INS}/${ids.uuid}`, permission: P.STOCK_IN_EDIT, target: T.STOCK_IN,
        body: (refs) => stockInBody(line(refs)),
    },
    { method: DELETE, path: (ids) => `${PATHS.STOCK_INS}/${ids.uuid}`, permission: P.STOCK_IN_DELETE, target: T.STOCK_IN },

    { method: GET, path: () => PATHS.STOCK_OUTS, permission: P.STOCK_OUT_VIEW },
    { method: GET, path: () => `${PATHS.STOCK_OUTS}/summary`, permission: P.STOCK_OUT_VIEW },
    { method: GET, path: (ids) => `${PATHS.STOCK_OUTS}/${ids.uuid}`, permission: P.STOCK_OUT_VIEW, target: T.STOCK_OUT },
    { method: POST, path: () => PATHS.STOCK_OUTS, permission: P.STOCK_OUT_CREATE },
    {
        method: PUT, path: (ids) => `${PATHS.STOCK_OUTS}/${ids.uuid}`, permission: P.STOCK_OUT_EDIT, target: T.STOCK_OUT,
        body: (refs) => stockOutBody(line(refs)),
    },
    { method: DELETE, path: (ids) => `${PATHS.STOCK_OUTS}/${ids.uuid}`, permission: P.STOCK_OUT_DELETE, target: T.STOCK_OUT },

    // Recipes
    { method: GET, path: () => PATHS.RECIPES, permission: P.RECIPE_VIEW },
    { method: GET, path: (ids) => `${PATHS.RECIPES}/${ids.uuid}`, permission: P.RECIPE_VIEW, target: T.RECIPE },
    { method: POST, path: () => PATHS.RECIPES, permission: P.RECIPE_ADD },
    {
        method: PUT, path: (ids) => `${PATHS.RECIPES}/${ids.uuid}`, permission: P.RECIPE_EDIT, target: T.RECIPE,
        body: (refs) => recipeBody(line(refs)),
    },
    {
        method: PATCH, path: (ids) => `${PATHS.RECIPES}/${ids.uuid}/status`, permission: P.RECIPE_ARCHIVE, target: T.RECIPE,
        body: () => ({ status: RecipeStatus.ARCHIVED }),
    },
    { method: DELETE, path: (ids) => `${PATHS.RECIPES}/${ids.uuid}`, permission: P.RECIPE_DELETE, target: T.RECIPE },

    // Pickers - every member
    { method: GET, path: () => `${PATHS.OPTIONS}/products`, permission: null },
    { method: GET, path: () => `${PATHS.OPTIONS}/suppliers`, permission: null },
    { method: GET, path: () => `${PATHS.OPTIONS}/receivers`, permission: null },
    { method: GET, path: () => `${PATHS.OPTIONS}/roles`, permission: null },
    { method: GET, path: () => `${PATHS.OPTIONS}/recipes`, permission: null },
    { method: GET, path: () => `${PATHS.OPTIONS}/kitchen-balance`, permission: null },
];

/** The "not found" each target gives when its uuid is not in the caller's company. */
export const TARGET_NOT_FOUND: Record<RouteTarget, { CODE: string; STATUS: number }> = {
    [T.PRODUCT]: ErrorCodes.PRODUCT.NOT_FOUND,
    [T.SUPPLIER]: ErrorCodes.SUPPLIER.NOT_FOUND,
    [T.SUPPLIER_CONTACT]: ErrorCodes.SUPPLIER.NOT_FOUND,
    [T.PRODUCT_CATEGORY]: ErrorCodes.PRODUCT_CATEGORY.NOT_FOUND,
    [T.ROLE]: ErrorCodes.ROLE.NOT_FOUND,
    [T.USER]: ErrorCodes.USER.NOT_FOUND,
    [T.STOCK_IN]: ErrorCodes.STOCK_IN.NOT_FOUND,
    [T.STOCK_OUT]: ErrorCodes.STOCK_OUT.NOT_FOUND,
    [T.RECIPE]: ErrorCodes.RECIPE.NOT_FOUND,
};

/** A route's label in case names and messages, e.g. "PUT /api/products/:uuid". */
export const routeLabel = (route: ICompanyRoute): string =>
    `${route.method} ${route.path({ uuid: ":uuid", contactUuid: ":contactUuid" })}`;
