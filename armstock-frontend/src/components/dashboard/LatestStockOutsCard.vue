<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import DashboardCard from './DashboardCard.vue';
import LatestDocumentsList from './LatestDocumentsList.vue';
import { StockOutService } from '../../services/StockOutService';
import { useCardData } from '../../composables/useCardData';
import { ROUTE_NAME } from '../../constants/constants';
import { LATEST_DOCUMENTS_COUNT } from '../../constants/dashboard';
import { STOCK_OUT_REASON_LABEL } from '../../constants/stockOutReasons';
import { stockOutDestination } from '../../utils/stockOutDestination';

const { t } = useI18n();

const { data, isLoading, hasError, load } = useCardData('latest stock-outs', async () =>
  (await StockOutService.list(1, LATEST_DOCUMENTS_COUNT, {})).items.map((doc) => ({
    uuid: doc.uuid,
    number: doc.number,
    date: doc.date,
    detail: stockOutDestination(doc, t),
    value: t(STOCK_OUT_REASON_LABEL[doc.reason]),
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
