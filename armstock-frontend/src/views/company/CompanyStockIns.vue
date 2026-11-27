<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Permission, type IPaginationMeta, type IStockIn, type IStockInSummary } from 'armstock-shared';
import { ArrowDownToLine, Plus } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import ExportButton from '../../components/ExportButton.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockInFilters from '../../components/company/StockInFilters.vue';
import StockInsTable from '../../components/company/StockInsTable.vue';
import StockInSummary from '../../components/company/StockInSummary.vue';
import { StockInService } from '../../services/StockInService';
import { useStockInDelete } from '../../composables/useStockInDelete';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE, ROUTE_NAME } from '../../constants/constants';
import type { IStockInFilters } from '../../interfaces/IStockInFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useExcelExport } from '../../composables/useExcelExport';
import AppPagination from '../../components/AppPagination.vue';

const router = useRouter();
const authStore = useAuthStore();
const { deleteStockIn } = useStockInDelete();
const { isExporting, runExport } = useExcelExport();

const canCreate = computed(() => !!authStore.user?.can(Permission.STOCK_IN_CREATE));
const canEdit = computed(() => !!authStore.user?.can(Permission.STOCK_IN_EDIT));
const canDelete = computed(() => !!authStore.user?.can(Permission.STOCK_IN_DELETE));

const stockIns = ref<IStockIn[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IStockInFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const busyUuid = ref<string | null>(null);
const summary = ref<IStockInSummary | null>(null);
const isSummaryLoading = ref(false);

const exportList = () => runExport(() => StockInService.export(filters.value));

const hasFilters = computed(() => Object.values(filters.value).some(Boolean));

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await StockInService.list(page, meta.value.pageSize, filters.value);
    stockIns.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load stock-in documents:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

// Covers every page, so it reloads only when the filters or the documents change - not on paging.
// Not critical: if it fails, the list still works and the line just stays hidden.
let lastSummaryRequest = 0;
const loadSummary = async () => {
  const request = ++lastSummaryRequest;
  isSummaryLoading.value = true;
  try {
    const result = await StockInService.summary(filters.value);
    if (request === lastSummaryRequest) summary.value = result;
  } catch (error) {
    AppLogger.error('Failed to load the stock-in summary:', error);
    if (request === lastSummaryRequest) summary.value = null;
  } finally {
    if (request === lastSummaryRequest) isSummaryLoading.value = false;
  }
};

const onFiltersChange = (newFilters: IStockInFilters) => {
  filters.value = newFilters;
  load(1);
  loadSummary();
};

const openView = (stockIn: IStockIn) => router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN, params: { uuid: stockIn.uuid } });
const openEdit = (stockIn: IStockIn) => router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN_EDIT, params: { uuid: stockIn.uuid } });

const onDelete = async (stockIn: IStockIn) => {
  busyUuid.value = stockIn.uuid;
  try {
    if (!(await deleteStockIn(stockIn))) return;
    // Stays on the same page unless it became empty.
    await Promise.all([
      load(stockIns.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page),
      loadSummary(),
    ]);
  } finally {
    busyUuid.value = null;
  }
};
</script>

<template>
  <section class="stock-ins-page">
    <PageHeader
      :title="$t('stockIn.title')"
      :subtitle="$t('stockIn.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <ExportButton :loading="isExporting" :disabled="!stockIns.length" @click="exportList" />
        <el-button v-if="canCreate" type="primary" @click="router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN_NEW })">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('stockIn.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <StockInFilters @change="onFiltersChange" />

    <StockInSummary v-if="summary && summary.documentCount > 0 && !hasError" :summary="summary" :is-loading="isSummaryLoading" />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockIn.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!stockIns.length" :description="$t(hasFilters ? 'stockIn.noResults' : 'stockIn.empty')">
        <template #image><ArrowDownToLine :size="40" aria-hidden="true" /></template>
      </el-empty>

      <StockInsTable
        v-else
        v-loading="isLoading"
        :stock-ins="stockIns"
        :current-user-uuid="authStore.user?.uuid ?? null"
        :can-edit-own="canEdit"
        :can-delete-own="canDelete"
        :busy-uuid="busyUuid"
        @open="openView"
        @edit="openEdit"
        @delete="onDelete"
      />
    </AppCard>

    <AppPagination :meta="meta" @change="load" />
  </section>
</template>

<style scoped>
.stock-ins-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-ins-page > :deep(.page-header) {
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
