<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { SupplierStatus } from 'armstock-shared';
import { Search } from 'lucide-vue-next';
import { SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { SUPPLIER_STATUS_TAG } from '../../constants/statusTags';
import type { ISupplierFilters } from '../../interfaces/ISupplierFilters';

const emit = defineEmits<{ change: [filters: ISupplierFilters] }>();

const STATUSES = [SupplierStatus.ACTIVE, SupplierStatus.ARCHIVED];

// Starts on Active - archived suppliers are the exception.
const form = reactive({
  search: '',
  status: SupplierStatus.ACTIVE as SupplierStatus | '',
});

const toFilters = (): ISupplierFilters => ({
  search: form.search.trim() || undefined,
  status: form.status || undefined,
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => form.search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => form.status, emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="supplier-filters">
    <el-input
      v-model="form.search"
      :placeholder="$t('suppliers.filters.search')"
      :aria-label="$t('suppliers.filters.search')"
      clearable
      class="supplier-filters__search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select
      v-model="form.status"
      :placeholder="$t('suppliers.filters.status')"
      :aria-label="$t('suppliers.filters.status')"
      clearable
      class="supplier-filters__select"
    >
      <el-option v-for="status in STATUSES" :key="status" :label="$t(SUPPLIER_STATUS_TAG[status].labelKey)" :value="status" />
    </el-select>
  </div>
</template>

<style scoped>
.supplier-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.supplier-filters__search {
  width: 280px;
}

.supplier-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .supplier-filters__search,
  .supplier-filters__select {
    width: 100%;
  }
}
</style>
