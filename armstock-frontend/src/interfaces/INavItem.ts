import type { Component } from 'vue';
import type { RouteName } from '../constants/constants';

/** A sidebar link to one page. */
export interface INavItem {
  id: string;
  labelKey: string;
  icon: Component;
  routeName: RouteName;
}
