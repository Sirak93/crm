<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { SupplierStatus, type IPaginationMeta, type ISupplier } from 'armstock-shared';
import { Plus, Truck } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import SupplierFilters from '../../components/company/SupplierFilters.vue';
import SuppliersTable from '../../components/company/SuppliersTable.vue';
import SupplierDialog from '../../components/company/SupplierDialog.vue';
import { SupplierService } from '../../services/SupplierService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { ISupplierFilters } from '../../interfaces/ISupplierFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const suppliers = ref<ISupplier[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<ISupplierFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const busyUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingSupplier = ref<ISupplier | null>(null);

const hasFilters = computed(() => !!filters.value.search);

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await SupplierService.list(page, meta.value.pageSize, filters.value);
    suppliers.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load suppliers:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const onFiltersChange = (newFilters: ISupplierFilters) => {
  filters.value = newFilters;
  load(1);
};

const openAdd = () => {
  editingSupplier.value = null;
  isDialogOpen.value = true;
};

const openEdit = (supplier: ISupplier) => {
  editingSupplier.value = supplier;
  isDialogOpen.value = true;
};

const onSaved = () => load(editingSupplier.value ? meta.value.page : 1);

/** Stays on the same page unless it became empty. */
const reloadAfterRemoval = () => load(suppliers.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page);

const setStatus = async (supplier: ISupplier, status: SupplierStatus) => {
  busyUuid.value = supplier.uuid;
  try {
    await SupplierService.setStatus(supplier.uuid, status);
    NotificationService.success(t(status === SupplierStatus.ARCHIVED ? 'suppliers.archived' : 'suppliers.restored'));
    // The row may no longer match the status filter.
    await (filters.value.status ? reloadAfterRemoval() : load());
  } catch (error) {
    NotificationService.error(parseError(error, 'suppliers.saveError'));
  } finally {
    busyUuid.value = null;
  }
};

const deleteSupplier = async (supplier: ISupplier) => {
  const confirmed = await NotificationService.confirm(
    t('suppliers.deleteConfirmTitle', { name: supplier.name }),
    t('suppliers.deleteConfirmText'),
    t('suppliers.actions.delete'),
  );
  if (!confirmed) return;

  busyUuid.value = supplier.uuid;
  try {
    await SupplierService.delete(supplier.uuid);
    NotificationService.success(t('suppliers.deleted'));
    await reloadAfterRemoval();
  } catch (error) {
    NotificationService.error(parseError(error, 'suppliers.deleteError'));
  } finally {
    busyUuid.value = null;
  }
};
</script>

<template>
  <section class="suppliers-page">
    <PageHeader
      :title="$t('suppliers.title')"
      :subtitle="$t('suppliers.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('suppliers.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <SupplierFilters @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('suppliers.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!suppliers.length" :description="$t(hasFilters ? 'suppliers.noResults' : 'suppliers.empty')">
        <template #image><Truck :size="40" aria-hidden="true" /></template>
      </el-empty>

      <SuppliersTable
        v-else
        v-loading="isLoading"
        :suppliers="suppliers"
        :busy-uuid="busyUuid"
        @edit="openEdit"
        @set-status="setStatus"
        @delete="deleteSupplier"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="suppliers-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />

    <SupplierDialog v-model="isDialogOpen" :supplier="editingSupplier" @saved="onSaved" />
  </section>
</template>

<style scoped>
.suppliers-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.suppliers-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.suppliers-pagination {
  justify-content: flex-end;
}
</style>
