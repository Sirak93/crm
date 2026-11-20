<script setup lang="ts">
import { computed } from 'vue';
import { Permission } from 'armstock-shared';
import { LayoutDashboard } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import QuickActionsCard from '../../components/dashboard/QuickActionsCard.vue';
import StockValueCard from '../../components/dashboard/StockValueCard.vue';
import StockInMonthCard from '../../components/dashboard/StockInMonthCard.vue';
import StockOutMonthCard from '../../components/dashboard/StockOutMonthCard.vue';
import UsersCard from '../../components/dashboard/UsersCard.vue';
import LatestStockInsCard from '../../components/dashboard/LatestStockInsCard.vue';
import LatestStockOutsCard from '../../components/dashboard/LatestStockOutsCard.vue';
import { useAuthStore } from '../../stores/auth';

const QUICK_ACTION_PERMISSIONS = [
  Permission.STOCK_IN_CREATE,
  Permission.STOCK_OUT_CREATE,
  Permission.PRODUCT_ADD,
  Permission.SUPPLIER_ADD,
  Permission.USER_ADD,
];

const authStore = useAuthStore();
const can = (permission: Permission) => !!authStore.user?.can(permission);

const showActions = computed(() => !!authStore.user?.canAny(QUICK_ACTION_PERMISSIONS));
const showStockValue = computed(() => can(Permission.STOCK_BALANCE_VIEW));
const showStockIn = computed(() => can(Permission.STOCK_IN_VIEW));
const showStockOut = computed(() => can(Permission.STOCK_OUT_VIEW));
const showUsers = computed(() => can(Permission.USER_VIEW));

const showNumbers = computed(() => showStockValue.value || showStockIn.value || showStockOut.value || showUsers.value);
const hasAnyCard = computed(() => showActions.value || showNumbers.value);
</script>

<template>
  <section class="dashboard">
    <PageHeader :title="$t('dashboard.title')" />

    <AppCard v-if="!hasAnyCard">
      <el-empty :description="$t('dashboard.noAccess')">
        <template #image><LayoutDashboard :size="40" aria-hidden="true" /></template>
      </el-empty>
    </AppCard>

    <template v-else>
      <QuickActionsCard v-if="showActions" />

      <div v-if="showNumbers" class="dashboard__numbers">
        <StockValueCard v-if="showStockValue" />
        <StockInMonthCard v-if="showStockIn" />
        <StockOutMonthCard v-if="showStockOut" />
        <UsersCard v-if="showUsers" />
      </div>

      <div v-if="showStockIn || showStockOut" class="dashboard__lists">
        <LatestStockInsCard v-if="showStockIn" />
        <LatestStockOutsCard v-if="showStockOut" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard > :deep(.page-header) {
  margin-bottom: 0;
}

.dashboard__numbers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 1rem;
}

.dashboard__lists {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 992px) {
  .dashboard__lists {
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  }
}
</style>
