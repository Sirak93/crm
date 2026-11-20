<script setup lang="ts">
import DashboardCard from './DashboardCard.vue';
import LatestDocumentsList from './LatestDocumentsList.vue';
import { StockInService } from '../../services/StockInService';
import { useCardData } from '../../composables/useCardData';
import { ROUTE_NAME } from '../../constants/constants';
import { LATEST_DOCUMENTS_COUNT } from '../../constants/dashboard';
import { formatMoney } from '../../utils/format';

const { data, isLoading, hasError, load } = useCardData('latest stock-ins', async () =>
  (await StockInService.list(1, LATEST_DOCUMENTS_COUNT, {})).items.map((doc) => ({
    uuid: doc.uuid,
    number: doc.number,
    date: doc.date,
    detail: doc.supplier?.name ?? '',
    value: formatMoney(doc.total),
  })),
);
</script>

<template>
  <DashboardCard
    :title="$t('dashboard.latestStockIns')"
    :is-loading="isLoading"
    :has-error="hasError"
    :to="{ name: ROUTE_NAME.COMPANY_STOCK_INS }"
    @retry="load"
  >
    <LatestDocumentsList v-if="data" :rows="data" :route-name="ROUTE_NAME.COMPANY_STOCK_IN" :empty-text="$t('dashboard.noStockIns')" />
  </DashboardCard>
</template>
