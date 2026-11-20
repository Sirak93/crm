export const DEFAULT_LOCALE = 'en';

/**
 * Where the tokens live. Shared so ApiService can read the access token per request without
 * importing the auth store, which imports ApiService.
 */
export const AUTH_COOKIE = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/** Refresh the access token this many seconds before it expires (covers clock drift and slow networks). */
export const TOKEN_REFRESH_MARGIN_SECONDS = 15;

export const ROUTE_NAME = {
  LOGIN: 'login',
  SYSTEM_STATUS: 'system-status',
  PLATFORM_DASHBOARD: 'platform-dashboard',
  PLATFORM_COMPANIES: 'platform-companies',
  PLATFORM_COMPANY_USERS: 'platform-company-users',
  PLATFORM_DATABASE: 'platform-database',
  PLATFORM_LOGS: 'platform-logs',
  COMPANY_DASHBOARD: 'company-dashboard',
  COMPANY_PRODUCTS: 'company-products',
  COMPANY_SUPPLIERS: 'company-suppliers',
  COMPANY_STOCK_INS: 'company-stock-ins',
  COMPANY_STOCK_IN_NEW: 'company-stock-in-new',
  COMPANY_STOCK_IN: 'company-stock-in',
  COMPANY_STOCK_IN_EDIT: 'company-stock-in-edit',
  COMPANY_STOCK_OUTS: 'company-stock-outs',
  COMPANY_STOCK_OUT_NEW: 'company-stock-out-new',
  COMPANY_STOCK_OUT: 'company-stock-out',
  COMPANY_STOCK_OUT_EDIT: 'company-stock-out-edit',
  COMPANY_STOCK_BALANCE: 'company-stock-balance',
  COMPANY_MEASURE_UNITS: 'company-measure-units',
  COMPANY_PRODUCT_CATEGORIES: 'company-product-categories',
  COMPANY_USERS: 'company-users',
  COMPANY_ROLES: 'company-roles',
  COMPANY_PROFILE: 'company-profile',
} as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const DEFAULT_PAGE_SIZE = 20;

/** Required-field rules also run while typing, so the error clears as soon as the field is filled. */
export const REQUIRED_RULE_TRIGGER = ['blur', 'change'];

/** Wait after the last keystroke before a search request. */
export const SEARCH_DEBOUNCE_MS = 400;

/** Element Plus date picker display format - matches formatDateTime. */
export const DATE_PICKER_FORMAT = 'DD/MM/YYYY';
export const DATE_TIME_PICKER_FORMAT = 'DD/MM/YYYY HH:mm';

export type RouteName = typeof ROUTE_NAME[keyof typeof ROUTE_NAME];

/** `?add=1` on a list page opens its "add" dialog - used by the dashboard quick actions. */
export const ADD_QUERY = { add: '1' } as const;

/** Put on the product's barcode field: a scan there just fills the field instead of running the page's scan action. */
export const BARCODE_INPUT_ATTR = 'data-barcode-input';
