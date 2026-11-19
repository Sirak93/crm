import type { Component } from 'vue';
import type { INavItem } from './INavItem';

/** A sidebar entry that opens to show its own links. Shown when the user can see at least one of them. */
export interface INavGroup {
  id: string;
  labelKey: string;
  icon: Component;
  children: INavItem[];
}
