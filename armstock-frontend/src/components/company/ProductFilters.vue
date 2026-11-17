<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { ProductStatus, type IProductCategory } from 'armstock-shared';
import { Search } from 'lucide-vue-next';
import { SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { PRODUCT_STATUS_TAG } from '../../constants/statusTags';
import type { IProductFilters } from '../../interfaces/IProductFilters';

defineProps<{ categories: IProductCategory[] }>();

const emit = defineEmits<{ change: [filters: IProductFilters] }>();

const STATUSES = [ProductStatus.ACTIVE, ProductStatus.ARCHIVED];

// Starts on Active - archived products are the exception.
const form = reactive({
  search: '',
  categoryUuid: '' as string,
  status: ProductStatus.ACTIVE as ProductStatus | '',
});

const toFilters = (): IProductFilters => ({
  search: form.search.trim() || undefined,
  categoryUuid: form.categoryUuid || undefined,
  status: form.status || undefined,
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => form.search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => [form.categoryUuid, form.status], emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="product-filters">
    <el-input
      v-model="form.search"
      :placeholder="$t('products.filters.search')"
      :aria-label="$t('products.filters.search')"
      clearable
      class="product-filters__search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select
      v-model="form.categoryUuid"
      :placeholder="$t('products.filters.category')"
      :aria-label="$t('products.filters.category')"
      clearable
      filterable
      class="product-filters__select"
    >
      <el-option v-for="category in categories" :key="category.uuid" :label="category.name" :value="category.uuid" />
    </el-select>

    <el-select
      v-model="form.status"
      :placeholder="$t('products.filters.status')"
      :aria-label="$t('products.filters.status')"
      clearable
      class="product-filters__select"
    >
      <el-option v-for="status in STATUSES" :key="status" :label="$t(PRODUCT_STATUS_TAG[status].labelKey)" :value="status" />
    </el-select>
  </div>
</template>

<style scoped>
.product-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.product-filters__search {
  width: 280px;
}

.product-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .product-filters__search,
  .product-filters__select {
    width: 100%;
  }
}
</style>
