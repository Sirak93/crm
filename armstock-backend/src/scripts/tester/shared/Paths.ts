import { API_PATH } from "armstock-shared";

/** Every API base path the suites call. Item paths are built as `${PATHS.X}/${uuid}`. */
export const PATHS = {
    LOGIN: `${API_PATH}/auth/login`,
    PLATFORM_COMPANIES: `${API_PATH}/platform/companies`,
    COMPANY_USERS: `${API_PATH}/company/users`,
    ROLES: `${API_PATH}/roles`,
    MEASURE_UNITS: `${API_PATH}/measure-units`,
    PRODUCT_CATEGORIES: `${API_PATH}/product-categories`,
    PRODUCTS: `${API_PATH}/products`,
    SUPPLIERS: `${API_PATH}/suppliers`,
    STOCK_INS: `${API_PATH}/stock-ins`,
    STOCK_OUTS: `${API_PATH}/stock-outs`,
} as const;
