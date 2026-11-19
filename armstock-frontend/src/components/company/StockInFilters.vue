<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import type { StockInReason } from 'armstock-shared';
import SupplierSelect from './SupplierSelect.vue';
import { DATE_PICKER_FORMAT } from '../../constants/constants';
import { STOCK_IN_REASON_LABEL, STOCK_IN_REASONS } from '../../constants/stockInReasons';
import type { IStockInFilters } from '../../interfaces/IStockInFilters';

const emit = defineEmits<{ change: [filters: IStockInFilters] }>();

const form = reactive({
  dateRange: null as [string, string] | null,
  reason: '' as StockInReason | '',
  supplierUuid: '',
});

const toFilters = (): IStockInFilters => ({
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
  <div class="stock-in-filters">
    <el-date-picker
      v-model="form.dateRange"
      type="daterange"
      value-format="YYYY-MM-DD"
      :format="DATE_PICKER_FORMAT"
      :range-separator="$t('stockIn.filters.to')"
      :start-placeholder="$t('stockIn.filters.startDate')"
      :end-placeholder="$t('stockIn.filters.endDate')"
      class="stock-in-filters__dates"
    />

    <el-select
      v-model="form.reason"
      :placeholder="$t('stockIn.filters.reason')"
      :aria-label="$t('stockIn.filters.reason')"
      clearable
      class="stock-in-filters__select"
    >
      <el-option v-for="reason in STOCK_IN_REASONS" :key="reason" :label="$t(STOCK_IN_REASON_LABEL[reason])" :value="reason" />
    </el-select>

    <SupplierSelect v-model="form.supplierUuid" :placeholder="$t('stockIn.filters.supplier')" class="stock-in-filters__select" />
  </div>
</template>

<style scoped>
.stock-in-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.stock-in-filters__dates {
  max-width: 300px;
}

.stock-in-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .stock-in-filters__dates,
  .stock-in-filters__select {
    width: 100%;
    max-width: none;
  }
}
</style>
