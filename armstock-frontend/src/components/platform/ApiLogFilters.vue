<script setup lang="ts">
import { reactive, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import { DATE_PICKER_FORMAT, HTTP_METHODS, SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import type { IApiLogFilters } from '../../interfaces/IApiLogFilters';
import { pickerRangeToIso } from '../../utils/appTime';

const emit = defineEmits<{ change: [filters: IApiLogFilters] }>();

const STATUS = { SUCCESS: 'success', FAILED: 'failed' } as const;
type Status = typeof STATUS[keyof typeof STATUS];

const form = reactive({
  method: '' as string,
  path: '',
  ip: '',
  status: '' as Status | '',
  slowOnly: false,
  dateRange: null as [string, string] | null,
});

const toFilters = (): IApiLogFilters => ({
  method: form.method || undefined,
  path: form.path.trim() || undefined,
  ip: form.ip.trim() || undefined,
  success: form.status ? form.status === STATUS.SUCCESS : undefined,
  slow: form.slowOnly || undefined,
  // Whole days in Armenian time.
  ...pickerRangeToIso(form.dateRange),
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => [form.path, form.ip], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => [form.method, form.status, form.slowOnly, form.dateRange], emitChange);
</script>

<template>
  <div class="log-filters">
    <el-select v-model="form.method" :placeholder="$t('platform.logs.filters.method')" clearable class="log-filters__input">
      <el-option v-for="method in HTTP_METHODS" :key="method" :label="method" :value="method" />
    </el-select>

    <el-input v-model="form.path" :placeholder="$t('platform.logs.filters.path')" clearable class="log-filters__input">
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-input v-model="form.ip" :placeholder="$t('platform.logs.filters.ip')" clearable class="log-filters__input">
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select v-model="form.status" :placeholder="$t('platform.logs.filters.status')" clearable class="log-filters__input">
      <el-option :label="$t('platform.logs.filters.succeeded')" :value="STATUS.SUCCESS" />
      <el-option :label="$t('platform.logs.filters.failed')" :value="STATUS.FAILED" />
    </el-select>

    <el-checkbox v-model="form.slowOnly">{{ $t('platform.logs.filters.slowOnly') }}</el-checkbox>

    <el-date-picker
      v-model="form.dateRange"
      type="daterange"
      value-format="YYYY-MM-DD"
      :format="DATE_PICKER_FORMAT"
      :range-separator="$t('platform.logs.filters.to')"
      :start-placeholder="$t('platform.logs.filters.startDate')"
      :end-placeholder="$t('platform.logs.filters.endDate')"
      class="log-filters__dates"
    />

    <div class="log-filters__end">
      <slot name="end" />
    </div>
  </div>
</template>

<style scoped>
.log-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.log-filters__input {
  width: 180px;
}

.log-filters__dates {
  max-width: 300px;
}

.log-filters__end {
  margin-left: auto;
}

@media (max-width: 576px) {
  .log-filters__input,
  .log-filters__dates {
    width: 100%;
    max-width: none;
  }

  .log-filters__end {
    margin-left: 0;
  }
}
</style>
