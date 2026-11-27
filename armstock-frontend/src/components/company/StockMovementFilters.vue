<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import type { IProductCategory } from 'armstock-shared';
import { Search } from 'lucide-vue-next';
import { DATE_PICKER_FORMAT, SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import type { IStockMovementFilters } from '../../interfaces/IStockMovementFilters';
import { isFutureDay, pickerRangeToIso, thisMonthRange } from '../../utils/appTime';
import { useDateRangeShortcuts } from '../../composables/useDateRangeShortcuts';

defineProps<{ categories: IProductCategory[] }>();

const emit = defineEmits<{ change: [filters: IStockMovementFilters] }>();

const { shortcuts: dateShortcuts, activeClass: activeShortcutClass } = useDateRangeShortcuts();

const form = reactive({
  search: '',
  categoryUuid: '',
  dateRange: thisMonthRange() as [string, string] | null,
  withoutMovement: false,
});

const toFilters = (): IStockMovementFilters => ({
  search: form.search.trim() || undefined,
  categoryUuid: form.categoryUuid || undefined,
  ...pickerRangeToIso(form.dateRange),
  withoutMovement: form.withoutMovement,
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => form.search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => [form.categoryUuid, form.dateRange, form.withoutMovement], emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="stock-movement-filters">
    <el-date-picker
      v-model="form.dateRange"
      type="daterange"
      value-format="YYYY-MM-DD"
      :format="DATE_PICKER_FORMAT"
      :disabled-date="isFutureDay"
      :shortcuts="dateShortcuts"
      :popper-class="activeShortcutClass(form.dateRange)"
      :range-separator="$t('stockMovement.filters.to')"
      :start-placeholder="$t('stockMovement.filters.startDate')"
      :end-placeholder="$t('stockMovement.filters.endDate')"
      class="stock-movement-filters__dates"
    />

    <el-input
      v-model="form.search"
      :placeholder="$t('stockBalance.filters.search')"
      :aria-label="$t('stockBalance.filters.search')"
      clearable
      class="stock-movement-filters__search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select
      v-model="form.categoryUuid"
      :placeholder="$t('stockBalance.filters.category')"
      :aria-label="$t('stockBalance.filters.category')"
      clearable
      filterable
      class="stock-movement-filters__select"
    >
      <el-option v-for="category in categories" :key="category.uuid" :label="category.name" :value="category.uuid" />
    </el-select>

    <el-checkbox v-model="form.withoutMovement" :label="$t('stockMovement.filters.withoutMovement')" />
  </div>
</template>

<style scoped>
.stock-movement-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

.stock-movement-filters__dates {
  max-width: 300px;
}

.stock-movement-filters__search {
  width: 280px;
}

.stock-movement-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .stock-movement-filters__dates,
  .stock-movement-filters__search,
  .stock-movement-filters__select {
    width: 100%;
    max-width: none;
  }
}
</style>
