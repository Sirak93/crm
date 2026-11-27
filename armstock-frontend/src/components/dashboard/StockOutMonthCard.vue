<script setup lang="ts">
import DashboardCard from './DashboardCard.vue';
import StockOutSummary from '../company/StockOutSummary.vue';
import { StockOutService } from '../../services/StockOutService';
import { useCardData } from '../../composables/useCardData';
import { monthStartIso } from '../../utils/appTime';

const { data, isLoading, hasError, load } = useCardData('stock-out month', () => StockOutService.summary({ dateFrom: monthStartIso() }));
</script>

<template>
  <DashboardCard :title="$t('dashboard.stockOutMonth')" :is-loading="isLoading" :has-error="hasError" @retry="load">
    <StockOutSummary v-if="data" :summary="data" :is-loading="false" />
  </DashboardCard>
</template>
