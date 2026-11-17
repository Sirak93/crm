import type { Component } from 'vue';
import { Building, Building2, Database, LayoutDashboard, Ruler, ScrollText, Tags, Users } from 'lucide-vue-next';
import { COMPANY_LOGIN_ROLES, UserRole } from 'armstock-shared';
import { ROUTE_NAME, type RouteName } from '../constants/constants';

export interface INavItem {
  id: string;
  labelKey: string;
  icon: Component;
  routeName: RouteName;
  roles: UserRole[];
}

/** Sidebar menu; each user sees only the items for their role. */
export const NAV_ITEMS: INavItem[] = [
  {
    id: 'platform-dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    routeName: ROUTE_NAME.PLATFORM_DASHBOARD,
    roles: [UserRole.PLATFORM_OWNER],
  },
  {
    id: 'platform-companies',
    labelKey: 'nav.companies',
    icon: Building2,
    routeName: ROUTE_NAME.PLATFORM_COMPANIES,
    roles: [UserRole.PLATFORM_OWNER],
  },
  {
    id: 'platform-database',
    labelKey: 'nav.database',
    icon: Database,
    routeName: ROUTE_NAME.PLATFORM_DATABASE,
    roles: [UserRole.PLATFORM_OWNER],
  },
  {
    id: 'platform-logs',
    labelKey: 'nav.logs',
    icon: ScrollText,
    routeName: ROUTE_NAME.PLATFORM_LOGS,
    roles: [UserRole.PLATFORM_OWNER],
  },
  {
    id: 'company-dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    routeName: ROUTE_NAME.COMPANY_DASHBOARD,
    roles: [...COMPANY_LOGIN_ROLES],
  },
  {
    id: 'company-measure-units',
    labelKey: 'nav.measureUnits',
    icon: Ruler,
    routeName: ROUTE_NAME.COMPANY_MEASURE_UNITS,
    roles: [...COMPANY_LOGIN_ROLES],
  },
  {
    id: 'company-product-categories',
    labelKey: 'nav.productCategories',
    icon: Tags,
    routeName: ROUTE_NAME.COMPANY_PRODUCT_CATEGORIES,
    roles: [...COMPANY_LOGIN_ROLES],
  },
  {
    id: 'company-users',
    labelKey: 'nav.users',
    icon: Users,
    routeName: ROUTE_NAME.COMPANY_USERS,
    roles: [UserRole.COMPANY_OWNER],
  },
  {
    id: 'company-profile',
    labelKey: 'nav.company',
    icon: Building,
    routeName: ROUTE_NAME.COMPANY_PROFILE,
    roles: [UserRole.COMPANY_OWNER],
  },
];
