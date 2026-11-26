<script setup lang="ts">
import DashboardCard from './DashboardCard.vue';
import StockBalanceSummary from '../company/StockBalanceSummary.vue';
import { StockService } from '../../services/StockService';
import { useCardData } from '../../composables/useCardData';
import { ROUTE_NAME } from '../../constants/constants';

const { data, isLoading, hasError, load } = useCardData('stock balance', () => StockService.balanceSummary({ inStockOnly: true }));
</script>

<template>
  <DashboardCard
    :title="$t('dashboard.stockBalance')"
    :is-loading="isLoading"
    :has-error="hasError"
    :to="{ name: ROUTE_NAME.COMPANY_STOCK_BALANCE }"
    @retry="load"
  >
    <StockBalanceSummary v-if="data" :summary="data" :is-loading="false" />
  </DashboardCard>
</template>
