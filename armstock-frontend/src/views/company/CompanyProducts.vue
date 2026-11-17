<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ProductStatus, type IMeasureUnit, type IPaginationMeta, type IProduct, type IProductCategory } from 'armstock-shared';
import { Package, Plus } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import ProductFilters from '../../components/company/ProductFilters.vue';
import ProductsTable from '../../components/company/ProductsTable.vue';
import ProductDialog from '../../components/company/ProductDialog.vue';
import { ProductService } from '../../services/ProductService';
import { MeasureUnitService } from '../../services/MeasureUnitService';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { IProductFilters } from '../../interfaces/IProductFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();
const canManage = computed(() => !!authStore.user?.canManageCatalog);

const products = ref<IProduct[]>([]);
const units = ref<IMeasureUnit[]>([]);
const categories = ref<IProductCategory[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IProductFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const updatingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingProduct = ref<IProduct | null>(null);

const hasFilters = computed(() => !!(filters.value.search || filters.value.categoryUuid));

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await ProductService.list(page, meta.value.pageSize, filters.value);
    products.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load products:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

/** Units and categories for the filters and the dialog. */
const loadLookups = async () => {
  try {
    [units.value, categories.value] = await Promise.all([MeasureUnitService.list(), ProductCategoryService.list()]);
  } catch (error) {
    AppLogger.error('Failed to load units and categories:', error);
    hasError.value = true;
  }
};

const onFiltersChange = (newFilters: IProductFilters) => {
  filters.value = newFilters;
  load(1);
};

const retry = () => Promise.all([loadLookups(), load()]);

const openAdd = () => {
  editingProduct.value = null;
  isDialogOpen.value = true;
};

const openEdit = (product: IProduct) => {
  editingProduct.value = product;
  isDialogOpen.value = true;
};

const onSaved = () => load(editingProduct.value ? meta.value.page : 1);

const setStatus = async (product: IProduct, status: ProductStatus) => {
  updatingUuid.value = product.uuid;
  try {
    await ProductService.setStatus(product.uuid, status);
    NotificationService.success(t(status === ProductStatus.ARCHIVED ? 'products.archived' : 'products.restored'));
    // The row may no longer match the status filter.
    await load();
  } catch (error) {
    NotificationService.error(parseError(error, 'products.saveError'));
  } finally {
    updatingUuid.value = null;
  }
};

onMounted(loadLookups);
</script>

<template>
  <section class="products-page">
    <PageHeader
      :title="$t('products.title')"
      :subtitle="$t('products.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template v-if="canManage" #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('products.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <ProductFilters :categories="categories" @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('products.loadError')" @retry="retry" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!products.length" :description="$t(hasFilters ? 'products.noResults' : 'products.empty')">
        <template #image><Package :size="40" aria-hidden="true" /></template>
      </el-empty>

      <ProductsTable
        v-else
        v-loading="isLoading"
        :products="products"
        :can-manage="canManage"
        :updating-uuid="updatingUuid"
        @edit="openEdit"
        @set-status="setStatus"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="products-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />

    <ProductDialog
      v-if="canManage"
      v-model="isDialogOpen"
      :product="editingProduct"
      :units="units"
      :categories="categories"
      @saved="onSaved"
    />
  </section>
</template>

<style scoped>
.products-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.products-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.products-pagination {
  justify-content: flex-end;
}
</style>
