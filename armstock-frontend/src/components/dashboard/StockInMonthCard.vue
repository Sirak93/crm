<script setup lang="ts">
import DashboardCard from './DashboardCard.vue';
import StockInSummary from '../company/StockInSummary.vue';
import { StockInService } from '../../services/StockInService';
import { useCardData } from '../../composables/useCardData';
import { monthStartIso } from '../../utils/appTime';

const { data, isLoading, hasError, load } = useCardData('stock-in month', () => StockInService.summary({ dateFrom: monthStartIso() }));
</script>

<template>
  <DashboardCard :title="$t('dashboard.stockInMonth')" :is-loading="isLoading" :has-error="hasError" @retry="load">
    <StockInSummary v-if="data" :summary="data" :is-loading="false" />
  </DashboardCard>
</template>
