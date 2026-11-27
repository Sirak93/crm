<script setup lang="ts">
import { ref } from 'vue';
import type { IPaginationMeta, IProductCategory, IStockMovement } from 'armstock-shared';
import { ArrowLeftRight } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import ExportButton from '../../components/ExportButton.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockMovementFilters from '../../components/company/StockMovementFilters.vue';
import StockMovementTable from '../../components/company/StockMovementTable.vue';
import ProductMovementDialog from '../../components/company/ProductMovementDialog.vue';
import { StockService } from '../../services/StockService';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { IStockMovementFilters } from '../../interfaces/IStockMovementFilters';
import { formatNumber } from '../../utils/format';
import { useExcelExport } from '../../composables/useExcelExport';
import { AppLogger } from '../../utils/AppLogger';
import AppPagination from '../../components/AppPagination.vue';

const rows = ref<IStockMovement[]>([]);
const categories = ref<IProductCategory[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IStockMovementFilters>({ withoutMovement: false });
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const viewed = ref<IStockMovement | null>(null);
const isPopupOpen = ref(false);

const { isExporting, runExport } = useExcelExport();

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await StockService.movement(page, meta.value.pageSize, filters.value);
    rows.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load the stock movement:', error);
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
const onFiltersChange = (newFilters: IStockMovementFilters) => {
  filters.value = newFilters;
  load(1);
};

const view = (row: IStockMovement) => {
  viewed.value = row;
  isPopupOpen.value = true;
};

const exportTable = () => runExport(() => StockService.exportMovement(filters.value));

const exportRow = (row: IStockMovement) => runExport(() => StockService.exportProductMovement(row.uuid, filters.value));

const retry = () => Promise.all([loadCategories(), load()]);

loadCategories();
</script>

<template>
  <section class="stock-movement-page">
    <PageHeader
      :title="$t('stockMovement.title')"
      :subtitle="$t('stockMovement.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <ExportButton :loading="isExporting" :disabled="!rows.length" @click="exportTable" />
      </template>
    </PageHeader>

    <StockMovementFilters :categories="categories" @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockMovement.loadError')" @retry="retry" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!rows.length" :description="$t('stockMovement.empty')">
        <template #image><ArrowLeftRight :size="40" aria-hidden="true" /></template>
      </el-empty>

      <StockMovementTable v-else v-loading="isLoading" :rows="rows" @view="view" @export="exportRow" />
    </AppCard>

    <AppPagination :meta="meta" @change="load" />

    <ProductMovementDialog v-model="isPopupOpen" :product="viewed" :range="filters" />
  </section>
</template>

<style scoped>
.stock-movement-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-movement-page > :deep(.page-header) {
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
