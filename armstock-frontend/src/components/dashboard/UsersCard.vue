<script setup lang="ts">
import { Ban, UserCheck } from 'lucide-vue-next';
import DashboardCard from './DashboardCard.vue';
import StatCard from '../StatCard.vue';
import { CompanyUsersSummaryService } from '../../services/company/CompanyUsersSummaryService';
import { useCardData } from '../../composables/useCardData';
import { ROUTE_NAME } from '../../constants/constants';
import { formatNumber } from '../../utils/format';

const { data, isLoading, hasError, load } = useCardData('users', () => CompanyUsersSummaryService.get());
</script>

<template>
  <DashboardCard
    :title="$t('dashboard.users')"
    :is-loading="isLoading"
    :has-error="hasError"
    :to="{ name: ROUTE_NAME.COMPANY_USERS }"
    @retry="load"
  >
    <div v-if="data" class="users-card">
      <StatCard :label="$t('status.active')" :value="formatNumber(data.active)" :icon="UserCheck" color="success" compact />
      <StatCard :label="$t('status.blocked')" :value="formatNumber(data.blocked)" :icon="Ban" color="danger" compact />
    </div>
  </DashboardCard>
</template>

<style scoped>
.users-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}
</style>
