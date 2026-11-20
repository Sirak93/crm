import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { AccountType, COMPANY_ACCOUNT_TYPES, Permission } from 'armstock-shared';
import { ROUTE_NAME } from '../constants/constants';
import { MEASURE_UNIT_PERMISSIONS, PRODUCT_CATEGORY_PERMISSIONS } from '../constants/pagePermissions';
import { useAuthStore } from '../stores/auth';
import { AppLogger } from '../utils/AppLogger';
import { canOpen } from '../utils/canOpen';
import { showLostAccess } from '../utils/lostAccess';
import { ACCOUNT_HOME_ROUTE } from './accountHome';

const RouterLogger = AppLogger.child('ROUTER');

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('../layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: ROUTE_NAME.LOGIN,
        component: () => import('../views/Login.vue'),
        meta: { public: true, guestOnly: true },
      },
    ],
  },
  {
    path: '/status',
    name: ROUTE_NAME.SYSTEM_STATUS,
    component: () => import('../views/StartPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: 'dashboard',
        name: ROUTE_NAME.PLATFORM_DASHBOARD,
        component: () => import('../views/Dashboard.vue'),
        meta: { accountTypes: [AccountType.PLATFORM_OWNER] },
      },
      {
        path: 'companies',
        name: ROUTE_NAME.PLATFORM_COMPANIES,
        component: () => import('../views/platform/PlatformCompanies.vue'),
        meta: { accountTypes: [AccountType.PLATFORM_OWNER] },
      },
      {
        path: 'companies/:uuid/users',
        name: ROUTE_NAME.PLATFORM_COMPANY_USERS,
        component: () => import('../views/platform/PlatformCompanyUsers.vue'),
        props: true,
        meta: { accountTypes: [AccountType.PLATFORM_OWNER] },
      },
      {
        path: 'database',
        name: ROUTE_NAME.PLATFORM_DATABASE,
        component: () => import('../views/platform/PlatformDatabase.vue'),
        meta: { accountTypes: [AccountType.PLATFORM_OWNER] },
      },
      {
        path: 'logs',
        name: ROUTE_NAME.PLATFORM_LOGS,
        component: () => import('../views/platform/PlatformLogs.vue'),
        meta: { accountTypes: [AccountType.PLATFORM_OWNER] },
      },
      {
        path: 'home',
        name: ROUTE_NAME.COMPANY_DASHBOARD,
        component: () => import('../views/Dashboard.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES },
      },
      {
        path: 'products',
        name: ROUTE_NAME.COMPANY_PRODUCTS,
        component: () => import('../views/company/CompanyProducts.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.PRODUCT_VIEW] },
      },
      {
        path: 'suppliers',
        name: ROUTE_NAME.COMPANY_SUPPLIERS,
        component: () => import('../views/company/CompanySuppliers.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.SUPPLIER_VIEW] },
      },
      {
        path: 'stock/in',
        name: ROUTE_NAME.COMPANY_STOCK_INS,
        component: () => import('../views/company/CompanyStockIns.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_IN_VIEW] },
      },
      {
        path: 'stock/in/new',
        name: ROUTE_NAME.COMPANY_STOCK_IN_NEW,
        component: () => import('../views/company/CompanyStockInForm.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_IN_CREATE] },
      },
      {
        path: 'stock/in/:uuid',
        name: ROUTE_NAME.COMPANY_STOCK_IN,
        component: () => import('../views/company/CompanyStockInView.vue'),
        props: true,
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_IN_VIEW] },
      },
      {
        path: 'stock/in/:uuid/edit',
        name: ROUTE_NAME.COMPANY_STOCK_IN_EDIT,
        component: () => import('../views/company/CompanyStockInForm.vue'),
        props: true,
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_IN_EDIT] },
      },
      {
        path: 'stock/out',
        name: ROUTE_NAME.COMPANY_STOCK_OUTS,
        component: () => import('../views/company/CompanyStockOuts.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_OUT_VIEW] },
      },
      {
        path: 'stock/out/new',
        name: ROUTE_NAME.COMPANY_STOCK_OUT_NEW,
        component: () => import('../views/company/CompanyStockOutForm.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_OUT_CREATE] },
      },
      {
        path: 'stock/out/:uuid',
        name: ROUTE_NAME.COMPANY_STOCK_OUT,
        component: () => import('../views/company/CompanyStockOutView.vue'),
        props: true,
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_OUT_VIEW] },
      },
      {
        path: 'stock/out/:uuid/edit',
        name: ROUTE_NAME.COMPANY_STOCK_OUT_EDIT,
        component: () => import('../views/company/CompanyStockOutForm.vue'),
        props: true,
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_OUT_EDIT] },
      },
      {
        path: 'stock/balance',
        name: ROUTE_NAME.COMPANY_STOCK_BALANCE,
        component: () => import('../views/company/CompanyStockBalance.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.STOCK_BALANCE_VIEW] },
      },
      {
        path: 'measure-units',
        name: ROUTE_NAME.COMPANY_MEASURE_UNITS,
        component: () => import('../views/company/CompanyMeasureUnits.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [...MEASURE_UNIT_PERMISSIONS] },
      },
      {
        path: 'product-categories',
        name: ROUTE_NAME.COMPANY_PRODUCT_CATEGORIES,
        component: () => import('../views/company/CompanyProductCategories.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [...PRODUCT_CATEGORY_PERMISSIONS] },
      },
      {
        path: 'users',
        name: ROUTE_NAME.COMPANY_USERS,
        component: () => import('../views/company/CompanyUsers.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.USER_VIEW, Permission.USER_ADD] },
      },
      {
        path: 'roles',
        name: ROUTE_NAME.COMPANY_ROLES,
        component: () => import('../views/company/CompanyRoles.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.MANAGE_USER_PERMISSIONS] },
      },
      {
        path: 'company',
        name: ROUTE_NAME.COMPANY_PROFILE,
        component: () => import('../views/company/CompanyProfile.vue'),
        meta: { accountTypes: COMPANY_ACCOUNT_TYPES, permissions: [Permission.COMPANY_EDIT] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, from) => {
  const authStore = useAuthStore();
  const user = authStore.user;
  const homeRoute = user ? ACCOUNT_HOME_ROUTE[user.accountType] : undefined;

  if (to.meta.public) {
    return to.meta.guestOnly && homeRoute ? { name: homeRoute } : true;
  }

  if (!user || !homeRoute) {
    return { name: ROUTE_NAME.LOGIN };
  }

  if (!canOpen(user, to.meta.accountTypes, to.meta.permissions)) {
    if (to.path !== '/') {
      RouterLogger.warn(`Access denied to ${to.fullPath}`);
      // A reload of a page the user can no longer open (permissions changed meanwhile).
      if (from.matched.length === 0) void showLostAccess();
    }
    return { name: homeRoute };
  }

  return true;
});

export default router;
