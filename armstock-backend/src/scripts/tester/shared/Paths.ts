import { API_PATH } from "armstock-shared";

/** Every API base path the suites call. Item paths are built as `${PATHS.X}/${uuid}`. */
export const PATHS = {
    LOGIN: `${API_PATH}/auth/login`,
    REFRESH: `${API_PATH}/auth/refresh`,
    LOGOUT: `${API_PATH}/auth/logout`,
    AUTH_USER: `${API_PATH}/auth/user`,
    PLATFORM_COMPANIES: `${API_PATH}/platform/companies`,
    PLATFORM_STORAGE: `${API_PATH}/platform/database/storage`,
    PLATFORM_LOGS: `${API_PATH}/platform/logs`,
    HEALTH: `${API_PATH}/health`,
    COMPANY_USERS: `${API_PATH}/company/users`,
    OPTIONS: `${API_PATH}/options`,
    ROLES: `${API_PATH}/roles`,
    PRODUCT_CATEGORIES: `${API_PATH}/product-categories`,
    PRODUCTS: `${API_PATH}/products`,
    RECIPES: `${API_PATH}/recipes`,
    SUPPLIERS: `${API_PATH}/suppliers`,
    STOCK_INS: `${API_PATH}/stock-ins`,
    STOCK_OUTS: `${API_PATH}/stock-outs`,
    STOCK_BALANCE: `${API_PATH}/stock/balance`,
    STOCK_MOVEMENT: `${API_PATH}/stock/movement`,
    KITCHEN_BALANCE: `${API_PATH}/stock/kitchen-balance`,
} as const;
