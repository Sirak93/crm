<script setup lang="ts">
import DashboardCard from './DashboardCard.vue';
import LatestDocumentsList from './LatestDocumentsList.vue';
import { StockOutService } from '../../services/StockOutService';
import { useCardData } from '../../composables/useCardData';
import { ROUTE_NAME } from '../../constants/constants';
import { LATEST_DOCUMENTS_COUNT } from '../../constants/dashboard';
import { stockOutDestination } from '../../utils/stockOutDestination';
import { useStockReasons } from '../../composables/useStockReasons';

const { stockOutReasonName, departmentName } = useStockReasons();

const { data, isLoading, hasError, load } = useCardData('latest stock-outs', async () =>
  (await StockOutService.list(1, LATEST_DOCUMENTS_COUNT, {})).items.map((doc) => ({
    uuid: doc.uuid,
    number: doc.number,
    date: doc.date,
    detail: stockOutDestination(doc, departmentName),
    value: stockOutReasonName(doc.reason),
  })),
);
</script>

<template>
  <DashboardCard
    :title="$t('dashboard.latestStockOuts')"
    :is-loading="isLoading"
    :has-error="hasError"
    :to="{ name: ROUTE_NAME.COMPANY_STOCK_OUTS }"
    @retry="load"
  >
    <LatestDocumentsList v-if="data" :rows="data" :route-name="ROUTE_NAME.COMPANY_STOCK_OUT" :empty-text="$t('dashboard.noStockOuts')" />
  </DashboardCard>
</template>
