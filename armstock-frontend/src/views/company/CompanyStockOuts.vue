<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Permission, type IPaginationMeta, type IStockOut, type IStockOutSummary } from 'armstock-shared';
import { ArrowUpFromLine, Plus } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockOutFilters from '../../components/company/StockOutFilters.vue';
import StockOutsTable from '../../components/company/StockOutsTable.vue';
import StockOutSummary from '../../components/company/StockOutSummary.vue';
import { StockOutService } from '../../services/StockOutService';
import { useStockOutDelete } from '../../composables/useStockOutDelete';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE, ROUTE_NAME } from '../../constants/constants';
import type { IStockOutFilters } from '../../interfaces/IStockOutFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const router = useRouter();
const authStore = useAuthStore();
const { deleteStockOut } = useStockOutDelete();

const canCreate = computed(() => !!authStore.user?.can(Permission.STOCK_OUT_CREATE));

const stockOuts = ref<IStockOut[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IStockOutFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const busyUuid = ref<string | null>(null);
const summary = ref<IStockOutSummary | null>(null);
const isSummaryLoading = ref(false);

const hasFilters = computed(() => Object.values(filters.value).some(Boolean));

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await StockOutService.list(page, meta.value.pageSize, filters.value);
    stockOuts.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load stock-out documents:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

// Covers every page, so it reloads only when the filters or the documents change - not on paging.
// Not critical: if it fails, the list still works and the cards just stay hidden.
let lastSummaryRequest = 0;
const loadSummary = async () => {
  const request = ++lastSummaryRequest;
  isSummaryLoading.value = true;
  try {
    const result = await StockOutService.summary(filters.value);
    if (request === lastSummaryRequest) summary.value = result;
  } catch (error) {
    AppLogger.error('Failed to load the stock-out summary:', error);
    if (request === lastSummaryRequest) summary.value = null;
  } finally {
    if (request === lastSummaryRequest) isSummaryLoading.value = false;
  }
};

const onFiltersChange = (newFilters: IStockOutFilters) => {
  filters.value = newFilters;
  load(1);
  loadSummary();
};

const openView = (stockOut: IStockOut) => router.push({ name: ROUTE_NAME.COMPANY_STOCK_OUT, params: { uuid: stockOut.uuid } });
const openEdit = (stockOut: IStockOut) => router.push({ name: ROUTE_NAME.COMPANY_STOCK_OUT_EDIT, params: { uuid: stockOut.uuid } });

const onDelete = async (stockOut: IStockOut) => {
  busyUuid.value = stockOut.uuid;
  try {
    if (!(await deleteStockOut(stockOut))) return;
    // Stays on the same page unless it became empty.
    await Promise.all([
      load(stockOuts.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page),
      loadSummary(),
    ]);
  } finally {
    busyUuid.value = null;
  }
};
</script>

<template>
  <section class="stock-outs-page">
    <PageHeader
      :title="$t('stockOut.title')"
      :subtitle="$t('stockOut.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template v-if="canCreate" #actions>
        <el-button type="primary" @click="router.push({ name: ROUTE_NAME.COMPANY_STOCK_OUT_NEW })">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('stockOut.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <StockOutFilters @change="onFiltersChange" />

    <StockOutSummary v-if="summary && summary.documentCount > 0 && !hasError" :summary="summary" :is-loading="isSummaryLoading" />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockOut.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!stockOuts.length" :description="$t(hasFilters ? 'stockOut.noResults' : 'stockOut.empty')">
        <template #image><ArrowUpFromLine :size="40" aria-hidden="true" /></template>
      </el-empty>

      <StockOutsTable
        v-else
        v-loading="isLoading"
        :stock-outs="stockOuts"
        :current-user-uuid="authStore.user?.uuid ?? null"
        :can-edit-own="canCreate"
        :busy-uuid="busyUuid"
        @open="openView"
        @edit="openEdit"
        @delete="onDelete"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="stock-outs-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />
  </section>
</template>

<style scoped>
.stock-outs-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-outs-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.stock-outs-pagination {
  justify-content: flex-end;
}
</style>
