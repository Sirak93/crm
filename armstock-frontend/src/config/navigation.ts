import type { Component } from 'vue';
import { LayoutDashboard } from 'lucide-vue-next';
import { UserRole } from 'armstock-shared';
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
];
