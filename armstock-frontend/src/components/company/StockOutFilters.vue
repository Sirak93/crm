<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { StockOutReason } from 'armstock-shared';
import SupplierSelect from './SupplierSelect.vue';
import ReceiverSelect from './ReceiverSelect.vue';
import { DATE_PICKER_FORMAT } from '../../constants/constants';
import { STOCK_OUT_REASONS } from '../../constants/stockOutReasons';
import type { IStockOutFilters } from '../../interfaces/IStockOutFilters';
import { isFutureDay } from '../../utils/format';
import { thisMonthRange } from '../../utils/monthStart';
import { useDateRangeShortcuts } from '../../composables/useDateRangeShortcuts';
import { useStockReasons } from '../../composables/useStockReasons';

const { stockOutReasonName } = useStockReasons();

const emit = defineEmits<{ change: [filters: IStockOutFilters] }>();

const { shortcuts: dateShortcuts, activeClass: activeShortcutClass } = useDateRangeShortcuts();

const form = reactive({
  dateRange: thisMonthRange() as [string, string] | null,
  reason: '' as StockOutReason | '',
  supplierUuid: '',
  receiverUuid: '',
});

// Only a return has a supplier and only an issue has a receiver.
const showSupplier = computed(() => !form.reason || form.reason === StockOutReason.RETURNED);
const showReceiver = computed(() => !form.reason || form.reason === StockOutReason.ISSUED);

// A hidden filter must not keep narrowing the list.
watch(() => form.reason, () => {
  if (!showSupplier.value) form.supplierUuid = '';
  if (!showReceiver.value) form.receiverUuid = '';
});

const toFilters = (): IStockOutFilters => ({
  reason: form.reason || undefined,
  supplierUuid: form.supplierUuid || undefined,
  receiverUuid: form.receiverUuid || undefined,
  // Whole days in the browser's time zone.
  dateFrom: form.dateRange ? new Date(`${form.dateRange[0]}T00:00:00`).toISOString() : undefined,
  dateTo: form.dateRange ? new Date(`${form.dateRange[1]}T23:59:59.999`).toISOString() : undefined,
});

const emitChange = () => emit('change', toFilters());

watch(() => [form.dateRange, form.reason, form.supplierUuid, form.receiverUuid], emitChange);

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
      :popper-class="activeShortcutClass(form.dateRange)"
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
      <el-option v-for="reason in STOCK_OUT_REASONS" :key="reason" :label="stockOutReasonName(reason)" :value="reason" />
    </el-select>

    <SupplierSelect
      v-if="showSupplier"
      v-model="form.supplierUuid"
      :placeholder="$t('stockOut.filters.supplier')"
      class="stock-out-filters__select"
    />

    <ReceiverSelect
      v-if="showReceiver"
      v-model="form.receiverUuid"
      :placeholder="$t('stockOut.filters.receiver')"
      class="stock-out-filters__select"
    />
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
