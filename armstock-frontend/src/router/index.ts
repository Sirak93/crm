import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { UserRole } from 'armstock-shared';
import { ROUTE_NAME } from '../constants/constants';
import { useAuthStore } from '../stores/auth';
import { AppLogger } from '../utils/AppLogger';
import { ROLE_HOME_ROUTE } from './roleHome';

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
        component: () => import('../views/platform/PlatformDashboard.vue'),
        meta: { roles: [UserRole.PLATFORM_OWNER] },
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

router.beforeEach((to) => {
  const authStore = useAuthStore();
  const user = authStore.user;
  const homeRoute = user ? ROLE_HOME_ROUTE[user.role] : undefined;

  if (user && !homeRoute) {
    // A role with no pages yet cannot use the app.
    RouterLogger.warn(`No start page for role ${UserRole[user.role]}, logging out`);
    authStore.clearSession();
    return to.name === ROUTE_NAME.LOGIN ? true : { name: ROUTE_NAME.LOGIN };
  }

  if (to.meta.public) {
    return to.meta.guestOnly && homeRoute ? { name: homeRoute } : true;
  }

  if (!user || !homeRoute) {
    return { name: ROUTE_NAME.LOGIN };
  }

  const allowedRoles = to.meta.roles;
  if (!allowedRoles || !allowedRoles.includes(user.role)) {
    if (to.path !== '/') {
      RouterLogger.warn(`Access denied to ${to.fullPath} for role ${UserRole[user.role]}`);
    }
    return { name: homeRoute };
  }

  return true;
});

export default router;
