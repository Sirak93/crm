<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import type { IProductCategory } from 'armstock-shared';
import { Search } from 'lucide-vue-next';
import { SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import type { IStockBalanceFilters } from '../../interfaces/IStockBalanceFilters';

withDefaults(defineProps<{
  categories: IProductCategory[];
  /** The kitchen balance lists only what the kitchen has, so it hides the "only in stock" switch. */
  showInStockOnly?: boolean;
}>(), { showInStockOnly: true });

const emit = defineEmits<{ change: [filters: IStockBalanceFilters] }>();

const form = reactive({
  search: '',
  categoryUuid: '',
  inStockOnly: true,
});

const toFilters = (): IStockBalanceFilters => ({
  search: form.search.trim() || undefined,
  categoryUuid: form.categoryUuid || undefined,
  inStockOnly: form.inStockOnly,
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => form.search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => [form.categoryUuid, form.inStockOnly], emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="stock-balance-filters">
    <el-input
      v-model="form.search"
      :placeholder="$t('stockBalance.filters.search')"
      :aria-label="$t('stockBalance.filters.search')"
      clearable
      class="stock-balance-filters__search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select
      v-model="form.categoryUuid"
      :placeholder="$t('stockBalance.filters.category')"
      :aria-label="$t('stockBalance.filters.category')"
      clearable
      filterable
      class="stock-balance-filters__select"
    >
      <el-option v-for="category in categories" :key="category.uuid" :label="category.name" :value="category.uuid" />
    </el-select>

    <el-switch v-if="showInStockOnly" v-model="form.inStockOnly" :active-text="$t('stockBalance.filters.inStockOnly')" />
  </div>
</template>

<style scoped>
.stock-balance-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.stock-balance-filters__search {
  width: 280px;
}

.stock-balance-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .stock-balance-filters__search,
  .stock-balance-filters__select {
    width: 100%;
  }
}
</style>
