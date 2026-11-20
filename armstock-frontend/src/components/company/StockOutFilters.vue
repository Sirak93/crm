<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import type { StockOutReason } from 'armstock-shared';
import SupplierSelect from './SupplierSelect.vue';
import { DATE_PICKER_FORMAT } from '../../constants/constants';
import { STOCK_OUT_REASON_LABEL, STOCK_OUT_REASONS } from '../../constants/stockOutReasons';
import type { IStockOutFilters } from '../../interfaces/IStockOutFilters';
import { isFutureDay } from '../../utils/format';
import { useDateRangeShortcuts } from '../../composables/useDateRangeShortcuts';

const emit = defineEmits<{ change: [filters: IStockOutFilters] }>();

const dateShortcuts = useDateRangeShortcuts();

const form = reactive({
  dateRange: null as [string, string] | null,
  reason: '' as StockOutReason | '',
  supplierUuid: '',
});

const toFilters = (): IStockOutFilters => ({
  reason: form.reason || undefined,
  supplierUuid: form.supplierUuid || undefined,
  // Whole days in the browser's time zone.
  dateFrom: form.dateRange ? new Date(`${form.dateRange[0]}T00:00:00`).toISOString() : undefined,
  dateTo: form.dateRange ? new Date(`${form.dateRange[1]}T23:59:59.999`).toISOString() : undefined,
});

const emitChange = () => emit('change', toFilters());

watch(() => [form.dateRange, form.reason, form.supplierUuid], emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="stock-out-filters">
    <el-date-picker
      v-model="form.dateRange"
      type="daterange"
      value-format="YYYY-MM-DD"
      :format="DATE_PICKER_FORMAT"
      :disabled-date="isFutureDay"
      :shortcuts="dateShortcuts"
      :range-separator="$t('stockOut.filters.to')"
      :start-placeholder="$t('stockOut.filters.startDate')"
      :end-placeholder="$t('stockOut.filters.endDate')"
      class="stock-out-filters__dates"
    />

    <el-select
      v-model="form.reason"
      :placeholder="$t('stockOut.filters.reason')"
      :aria-label="$t('stockOut.filters.reason')"
      clearable
      class="stock-out-filters__select"
    >
      <el-option v-for="reason in STOCK_OUT_REASONS" :key="reason" :label="$t(STOCK_OUT_REASON_LABEL[reason])" :value="reason" />
    </el-select>

    <SupplierSelect v-model="form.supplierUuid" :placeholder="$t('stockOut.filters.supplier')" class="stock-out-filters__select" />
  </div>
</template>

<style scoped>
.stock-out-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.stock-out-filters__dates {
  max-width: 300px;
}

.stock-out-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .stock-out-filters__dates,
  .stock-out-filters__select {
    width: 100%;
    max-width: none;
  }
}
</style>
