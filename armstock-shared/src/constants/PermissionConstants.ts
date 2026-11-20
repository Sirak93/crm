import { Permission } from "../enums/Permission";
import { PermissionGroup } from "../enums/PermissionGroup";
import { DefaultRole } from "../enums/DefaultRole";

/** Panel order: each group with its permissions. */
export const PERMISSION_GROUPS: ReadonlyArray<{ group: PermissionGroup; permissions: readonly Permission[] }> = [
    { group: PermissionGroup.COMPANY, permissions: [Permission.COMPANY_EDIT] },
    {
        group: PermissionGroup.USERS,
        permissions: [Permission.USER_VIEW, Permission.USER_ADD, Permission.USER_EDIT, Permission.MANAGE_USER_PERMISSIONS],
    },
    {
        group: PermissionGroup.MEASURE_UNITS,
        permissions: [Permission.MEASURE_UNIT_ADD, Permission.MEASURE_UNIT_EDIT, Permission.MEASURE_UNIT_DELETE],
    },
    {
        group: PermissionGroup.PRODUCT_CATEGORIES,
        permissions: [
            Permission.PRODUCT_CATEGORY_ADD,
            Permission.PRODUCT_CATEGORY_EDIT,
            Permission.PRODUCT_CATEGORY_DELETE,
        ],
    },
    {
        group: PermissionGroup.PRODUCTS,
        permissions: [
            Permission.PRODUCT_VIEW,
            Permission.PRODUCT_ADD,
            Permission.PRODUCT_EDIT,
            Permission.PRODUCT_ARCHIVE,
            Permission.PRODUCT_DELETE,
        ],
    },
    {
        group: PermissionGroup.SUPPLIERS,
        permissions: [
            Permission.SUPPLIER_VIEW,
            Permission.SUPPLIER_ADD,
            Permission.SUPPLIER_EDIT,
            Permission.SUPPLIER_ARCHIVE,
            Permission.SUPPLIER_DELETE,
        ],
    },
    {
        group: PermissionGroup.SUPPLIER_CONTACTS,
        permissions: [
            Permission.SUPPLIER_CONTACT_ADD,
            Permission.SUPPLIER_CONTACT_EDIT,
            Permission.SUPPLIER_CONTACT_DELETE,
        ],
    },
    {
        group: PermissionGroup.STOCK,
        permissions: [
            Permission.STOCK_BALANCE_VIEW,
            Permission.STOCK_IN_VIEW,
            Permission.STOCK_IN_CREATE,
            Permission.STOCK_OUT_VIEW,
            Permission.STOCK_OUT_CREATE,
        ],
    },
];

/** Starting permissions of the default roles - used only when a new company is created. */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<DefaultRole, readonly Permission[]>> = {
    [DefaultRole.STOREKEEPER]: [
        Permission.MEASURE_UNIT_ADD,
        Permission.MEASURE_UNIT_EDIT,
        Permission.MEASURE_UNIT_DELETE,
        Permission.PRODUCT_CATEGORY_ADD,
        Permission.PRODUCT_CATEGORY_EDIT,
        Permission.PRODUCT_CATEGORY_DELETE,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_ADD,
        Permission.PRODUCT_EDIT,
        Permission.PRODUCT_ARCHIVE,
        Permission.PRODUCT_DELETE,
        Permission.SUPPLIER_VIEW,
        Permission.SUPPLIER_CONTACT_ADD,
        Permission.SUPPLIER_CONTACT_EDIT,
        Permission.SUPPLIER_CONTACT_DELETE,
        Permission.STOCK_BALANCE_VIEW,
        Permission.STOCK_IN_VIEW,
        Permission.STOCK_IN_CREATE,
        Permission.STOCK_OUT_VIEW,
        Permission.STOCK_OUT_CREATE,
    ],
    [DefaultRole.ACCOUNTANT]: [
        Permission.PRODUCT_VIEW,
        Permission.SUPPLIER_VIEW,
        Permission.SUPPLIER_ADD,
        Permission.SUPPLIER_EDIT,
        Permission.SUPPLIER_ARCHIVE,
        Permission.SUPPLIER_DELETE,
        Permission.SUPPLIER_CONTACT_ADD,
        Permission.SUPPLIER_CONTACT_EDIT,
        Permission.SUPPLIER_CONTACT_DELETE,
        Permission.STOCK_BALANCE_VIEW,
        Permission.STOCK_IN_VIEW,
        Permission.STOCK_OUT_VIEW,
    ],
    [DefaultRole.HR]: [Permission.USER_VIEW, Permission.USER_ADD],
    [DefaultRole.STAFF]: [],
};
