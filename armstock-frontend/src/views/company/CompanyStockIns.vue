<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { IPaginationMeta, IStockIn } from 'armstock-shared';
import { ArrowDownToLine, Plus } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockInFilters from '../../components/company/StockInFilters.vue';
import StockInsTable from '../../components/company/StockInsTable.vue';
import { StockInService } from '../../services/StockInService';
import { useStockInDelete } from '../../composables/useStockInDelete';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE, ROUTE_NAME } from '../../constants/constants';
import type { IStockInFilters } from '../../interfaces/IStockInFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const router = useRouter();
const authStore = useAuthStore();
const { deleteStockIn } = useStockInDelete();

const canManage = computed(() => !!authStore.user?.canManageStock);

const stockIns = ref<IStockIn[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IStockInFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const busyUuid = ref<string | null>(null);

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

const onFiltersChange = (newFilters: IStockInFilters) => {
  filters.value = newFilters;
  load(1);
};

const openView = (stockIn: IStockIn) => router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN, params: { uuid: stockIn.uuid } });
const openEdit = (stockIn: IStockIn) => router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN_EDIT, params: { uuid: stockIn.uuid } });

const onDelete = async (stockIn: IStockIn) => {
  busyUuid.value = stockIn.uuid;
  try {
    if (!(await deleteStockIn(stockIn))) return;
    // Stays on the same page unless it became empty.
    await load(stockIns.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page);
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
      <template v-if="canManage" #actions>
        <el-button type="primary" @click="router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN_NEW })">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('stockIn.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <StockInFilters @change="onFiltersChange" />

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
        :busy-uuid="busyUuid"
        @open="openView"
        @edit="openEdit"
        @delete="onDelete"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="stock-ins-pagination"
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

.stock-ins-pagination {
  justify-content: flex-end;
}
</style>
