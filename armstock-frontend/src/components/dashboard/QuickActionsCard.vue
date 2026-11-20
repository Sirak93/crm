<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { Permission } from 'armstock-shared';
import { ArrowDownToLine, ArrowUpFromLine, PackagePlus, Truck, UserPlus } from 'lucide-vue-next';
import AppCard from '../AppCard.vue';
import { ADD_QUERY, ROUTE_NAME } from '../../constants/constants';
import { useAuthStore } from '../../stores/auth';

interface IQuickAction {
  labelKey: string;
  icon: Component;
  to: RouteLocationRaw;
  permission: Permission;
}

const ACTIONS: IQuickAction[] = [
  { labelKey: 'dashboard.actions.stockIn', icon: ArrowDownToLine, to: { name: ROUTE_NAME.COMPANY_STOCK_IN_NEW }, permission: Permission.STOCK_IN_CREATE },
  { labelKey: 'dashboard.actions.stockOut', icon: ArrowUpFromLine, to: { name: ROUTE_NAME.COMPANY_STOCK_OUT_NEW }, permission: Permission.STOCK_OUT_CREATE },
  { labelKey: 'dashboard.actions.product', icon: PackagePlus, to: { name: ROUTE_NAME.COMPANY_PRODUCTS, query: ADD_QUERY }, permission: Permission.PRODUCT_ADD },
  { labelKey: 'dashboard.actions.supplier', icon: Truck, to: { name: ROUTE_NAME.COMPANY_SUPPLIERS, query: ADD_QUERY }, permission: Permission.SUPPLIER_ADD },
  { labelKey: 'dashboard.actions.user', icon: UserPlus, to: { name: ROUTE_NAME.COMPANY_USERS, query: ADD_QUERY }, permission: Permission.USER_ADD },
];

const authStore = useAuthStore();
const actions = computed(() => ACTIONS.filter((a) => authStore.user?.can(a.permission)));
</script>

<template>
  <AppCard v-if="actions.length" :title="$t('dashboard.quickActions')">
    <nav class="quick-actions" :aria-label="$t('dashboard.quickActions')">
      <router-link v-for="action in actions" :key="action.labelKey" :to="action.to" class="quick-action">
        <component :is="action.icon" :size="18" aria-hidden="true" />
        <span>{{ $t(action.labelKey) }}</span>
      </router-link>
    </nav>
  </AppCard>
</template>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.5rem;
}

.quick-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  text-decoration: none;
  transition: var(--transition);
}

.quick-action svg {
  color: var(--primary);
}

.quick-action:hover {
  border-color: var(--primary);
  background-color: var(--primary-light);
}

.quick-action:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
