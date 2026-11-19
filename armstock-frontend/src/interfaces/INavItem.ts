import type { Component } from 'vue';
import type { UserRole } from 'armstock-shared';
import type { RouteName } from '../constants/constants';

/** A sidebar link to one page. */
export interface INavItem {
  id: string;
  labelKey: string;
  icon: Component;
  routeName: RouteName;
  roles: UserRole[];
}
