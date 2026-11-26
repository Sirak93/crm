<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Permission, ProductStatus, type IPaginationMeta, type IProduct, type IProductCategory } from 'armstock-shared';
import { Package, Plus } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import ProductFilters from '../../components/company/ProductFilters.vue';
import ProductsTable from '../../components/company/ProductsTable.vue';
import ProductDialog from '../../components/company/ProductDialog.vue';
import { ProductService } from '../../services/ProductService';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { IProductFilters } from '../../interfaces/IProductFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useOpenAddFromQuery } from '../../composables/useOpenAddFromQuery';
import { useBarcodeScanner } from '../../composables/useBarcodeScanner';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();
const canAdd = computed(() => !!authStore.user?.can(Permission.PRODUCT_ADD));
const canEdit = computed(() => !!authStore.user?.can(Permission.PRODUCT_EDIT));
const canArchive = computed(() => !!authStore.user?.can(Permission.PRODUCT_ARCHIVE));
const canDelete = computed(() => !!authStore.user?.can(Permission.PRODUCT_DELETE));

const products = ref<IProduct[]>([]);
const categories = ref<IProductCategory[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IProductFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const updatingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingProduct = ref<IProduct | null>(null);
const newProductBarcode = ref('');
const isScanning = ref(false);

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

/** Categories for the filters and the dialog. */
const loadLookups = async () => {
  try {
    categories.value = await ProductCategoryService.list();
  } catch (error) {
    AppLogger.error('Failed to load categories:', error);
    hasError.value = true;
  }
};

const onFiltersChange = (newFilters: IProductFilters) => {
  filters.value = newFilters;
  load(1);
};

const retry = () => Promise.all([loadLookups(), load()]);

const openAdd = (barcode = '') => {
  editingProduct.value = null;
  newProductBarcode.value = barcode;
  isDialogOpen.value = true;
};

useOpenAddFromQuery(() => canAdd.value, () => openAdd());

const openEdit = (product: IProduct) => {
  editingProduct.value = product;
  isDialogOpen.value = true;
};

// Found: open it (or just name it without edit rights). Not found: create it with this barcode.
const onScan = async (barcode: string) => {
  isScanning.value = true;
  try {
    const { items: [product] } = await ProductService.list(1, 1, { barcode });
    if (product && canEdit.value) openEdit(product);
    else if (product) NotificationService.success(t('scanner.found', { name: product.name }));
    else if (canAdd.value) openAdd(barcode);
    else NotificationService.error(t('scanner.notFound', { barcode }));
  } catch (error) {
    NotificationService.error(parseError(error, 'scanner.lookupError'));
  } finally {
    isScanning.value = false;
  }
};

useBarcodeScanner(onScan, () => !isDialogOpen.value && !isScanning.value);

const onSaved = () => load(editingProduct.value ? meta.value.page : 1);

/** Stays on the same page unless it became empty. */
const reloadAfterRemoval = () => load(products.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page);

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

const deleteProduct = async (product: IProduct) => {
  const confirmed = await NotificationService.confirm(
    t('products.deleteConfirmTitle', { name: product.name }),
    t('products.deleteConfirmText'),
    t('products.actions.delete'),
  );
  if (!confirmed) return;

  updatingUuid.value = product.uuid;
  try {
    await ProductService.delete(product.uuid);
    NotificationService.success(t('products.deleted'));
    await reloadAfterRemoval();
  } catch (error) {
    NotificationService.error(parseError(error, 'products.deleteError'));
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
      <template v-if="canAdd" #actions>
        <el-button type="primary" @click="openAdd()">
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
        :can-edit="canEdit"
        :can-archive="canArchive"
        :can-delete="canDelete"
        :updating-uuid="updatingUuid"
        @edit="openEdit"
        @set-status="setStatus"
        @delete="deleteProduct"
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
      v-if="canAdd || canEdit"
      v-model="isDialogOpen"
      :product="editingProduct"
      :categories="categories"
      :initial-barcode="newProductBarcode"
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
