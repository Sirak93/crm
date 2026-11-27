<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { IPaginationMeta, IProductCategory, IStockBalance, IStockBalanceSummary } from 'armstock-shared';
import { Scale } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import ExportButton from '../../components/ExportButton.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockBalanceFilters from '../../components/company/StockBalanceFilters.vue';
import StockBalanceSummary from '../../components/company/StockBalanceSummary.vue';
import StockBalanceTable from '../../components/company/StockBalanceTable.vue';
import { StockService } from '../../services/StockService';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { IStockBalanceFilters } from '../../interfaces/IStockBalanceFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useExcelExport } from '../../composables/useExcelExport';
import AppPagination from '../../components/AppPagination.vue';

const balances = ref<IStockBalance[]>([]);
const categories = ref<IProductCategory[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IStockBalanceFilters>({ inStockOnly: true });
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);

const { isExporting, runExport } = useExcelExport();
const exportList = () => runExport(() => StockService.exportBalance(filters.value));
const summary = ref<IStockBalanceSummary | null>(null);
const isSummaryLoading = ref(false);

const hasFilters = computed(() => !!(filters.value.search || filters.value.categoryUuid));
const emptyKey = computed(() => {
  if (hasFilters.value) return 'stockBalance.noResults';
  return filters.value.inStockOnly ? 'stockBalance.empty' : 'stockBalance.emptyAll';
});

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await StockService.balance(page, meta.value.pageSize, filters.value);
    balances.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load the stock balance:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

// Not critical: if it fails, the list still works and the cards just stay hidden.
let lastSummaryRequest = 0;
const loadSummary = async () => {
  const request = ++lastSummaryRequest;
  isSummaryLoading.value = true;
  try {
    const result = await StockService.balanceSummary(filters.value);
    if (request === lastSummaryRequest) summary.value = result;
  } catch (error) {
    AppLogger.error('Failed to load the stock balance summary:', error);
    if (request === lastSummaryRequest) summary.value = null;
  } finally {
    if (request === lastSummaryRequest) isSummaryLoading.value = false;
  }
};

const loadCategories = async () => {
  try {
    categories.value = await ProductCategoryService.list();
  } catch (error) {
    AppLogger.error('Failed to load categories:', error);
    hasError.value = true;
  }
};

const onFiltersChange = (newFilters: IStockBalanceFilters) => {
  // The switch does not change the summary, so it reloads only for search and category.
  const summaryChanged = newFilters.search !== filters.value.search || newFilters.categoryUuid !== filters.value.categoryUuid;
  filters.value = newFilters;
  load(1);
  if (summaryChanged || !summary.value) loadSummary();
};

const retry = () => Promise.all([loadCategories(), load(), loadSummary()]);

onMounted(loadCategories);
</script>

<template>
  <section class="stock-balance-page">
    <PageHeader
      :title="$t('stockBalance.title')"
      :subtitle="$t('stockBalance.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <ExportButton :loading="isExporting" :disabled="!balances.length" @click="exportList" />
      </template>
    </PageHeader>

    <StockBalanceFilters :categories="categories" @change="onFiltersChange" />

    <StockBalanceSummary v-if="summary && summary.productCount > 0 && !hasError" :summary="summary" :is-loading="isSummaryLoading" />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockBalance.loadError')" @retry="retry" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!balances.length" :description="$t(emptyKey)">
        <template #image><Scale :size="40" aria-hidden="true" /></template>
      </el-empty>

      <StockBalanceTable v-else v-loading="isLoading" :balances="balances" />
    </AppCard>

    <AppPagination :meta="meta" @change="load" />
  </section>
</template>

<style scoped>
.stock-balance-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-balance-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}
</style>
