<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Permission, type IProductCategory } from 'armstock-shared';
import { Plus, Search, Tags } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import ProductCategoriesTable from '../../components/company/ProductCategoriesTable.vue';
import ProductCategoryDialog from '../../components/company/ProductCategoryDialog.vue';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();
const canAdd = computed(() => !!authStore.user?.can(Permission.PRODUCT_CATEGORY_ADD));
const canEdit = computed(() => !!authStore.user?.can(Permission.PRODUCT_CATEGORY_EDIT));
const canDelete = computed(() => !!authStore.user?.can(Permission.PRODUCT_CATEGORY_DELETE));

const categories = ref<IProductCategory[]>([]);
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const deletingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingCategory = ref<IProductCategory | null>(null);

// The list is small, so it is filtered here instead of on the server.
const filteredCategories = computed(() => {
  const term = search.value.trim().toLowerCase();
  return term ? categories.value.filter((c) => c.name.toLowerCase().includes(term)) : categories.value;
});

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    categories.value = await ProductCategoryService.list();
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load product categories:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const openAdd = () => {
  editingCategory.value = null;
  isDialogOpen.value = true;
};

const openEdit = (category: IProductCategory) => {
  editingCategory.value = category;
  isDialogOpen.value = true;
};

const deleteCategory = async (category: IProductCategory) => {
  const confirmed = await NotificationService.confirm(
    t('productCategories.deleteConfirmTitle', { name: category.name }),
    t('productCategories.deleteConfirmText'),
    t('productCategories.actions.delete'),
  );
  if (!confirmed) return;

  deletingUuid.value = category.uuid;
  try {
    await ProductCategoryService.delete(category.uuid);
    categories.value = categories.value.filter((c) => c.uuid !== category.uuid);
    NotificationService.success(t('productCategories.deleted'));
  } catch (error) {
    NotificationService.error(parseError(error, 'productCategories.deleteError'));
  } finally {
    deletingUuid.value = null;
  }
};

onMounted(load);
</script>

<template>
  <section class="categories-page">
    <PageHeader
      :title="$t('productCategories.title')"
      :subtitle="$t('productCategories.subtitle')"
      :badge="hasLoaded ? formatNumber(categories.length) : undefined"
    >
      <template v-if="canAdd" #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('productCategories.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('productCategories.searchPlaceholder')"
      :aria-label="$t('productCategories.searchPlaceholder')"
      clearable
      class="categories-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('productCategories.loadError')" @retry="load" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="4" animated class="skeleton" />

      <el-empty
        v-else-if="!filteredCategories.length"
        :description="$t(search.trim() ? 'productCategories.noResults' : 'productCategories.empty')"
      >
        <template #image><Tags :size="40" aria-hidden="true" /></template>
      </el-empty>

      <ProductCategoriesTable
        v-else
        v-loading="isLoading"
        :categories="filteredCategories"
        :can-edit="canEdit" :can-delete="canDelete"
        :deleting-uuid="deletingUuid"
        @edit="openEdit"
        @delete="deleteCategory"
      />
    </AppCard>

    <ProductCategoryDialog v-if="canAdd || canEdit" v-model="isDialogOpen" :category="editingCategory" @saved="load" />
  </section>
</template>

<style scoped>
.categories-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.categories-page > :deep(.page-header) {
  margin-bottom: 0;
}

.categories-search {
  max-width: 320px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}
</style>
