<script setup lang="ts">
import { computed, ref } from 'vue';
import { RECIPE_QUANTITY_DECIMALS, type IPaginationMeta, type IProductCategory, type IStockBalance } from 'armstock-shared';
import { CookingPot } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import ExportButton from '../../components/ExportButton.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockBalanceFilters from '../../components/company/StockBalanceFilters.vue';
import StockBalanceTable from '../../components/company/StockBalanceTable.vue';
import { StockService } from '../../services/StockService';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { IStockBalanceFilters } from '../../interfaces/IStockBalanceFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useExcelExport } from '../../composables/useExcelExport';
import AppPagination from '../../components/AppPagination.vue';

/** What the kitchen got but did not need yet - read only, worked out from the stock-outs. */
const balances = ref<IStockBalance[]>([]);
const categories = ref<IProductCategory[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IStockBalanceFilters>({ inStockOnly: true });
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);

const { isExporting, runExport } = useExcelExport();
const exportList = () => runExport(() => StockService.exportKitchenBalance(filters.value));

const emptyKey = computed(() => (filters.value.search || filters.value.categoryUuid ? 'kitchenBalance.noResults' : 'kitchenBalance.empty'));

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await StockService.kitchenBalance(page, meta.value.pageSize, filters.value);
    balances.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load the kitchen balance:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
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

// The filters emit once on mount, which starts the first load.
const onFiltersChange = (newFilters: IStockBalanceFilters) => {
  filters.value = newFilters;
  load(1);
};

const retry = () => Promise.all([loadCategories(), load()]);

loadCategories();
</script>

<template>
  <section class="kitchen-balance-page">
    <PageHeader
      :title="$t('kitchenBalance.title')"
      :subtitle="$t('kitchenBalance.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <ExportButton :loading="isExporting" :disabled="!balances.length" @click="exportList" />
      </template>
    </PageHeader>

    <StockBalanceFilters :categories="categories" :show-in-stock-only="false" @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('kitchenBalance.loadError')" @retry="retry" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!balances.length" :description="$t(emptyKey)">
        <template #image><CookingPot :size="40" aria-hidden="true" /></template>
      </el-empty>

      <StockBalanceTable v-else v-loading="isLoading" :balances="balances" :decimals="RECIPE_QUANTITY_DECIMALS" />
    </AppCard>

    <AppPagination :meta="meta" @change="load" />
  </section>
</template>

<style scoped>
.kitchen-balance-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.kitchen-balance-page > :deep(.page-header) {
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
