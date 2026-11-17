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
  COMPANY_USERS: 'company-users',
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

export type RouteName = typeof ROUTE_NAME[keyof typeof ROUTE_NAME];
