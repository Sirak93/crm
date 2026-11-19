<script setup lang="ts">
import { computed, ref } from 'vue';
import { SupplierStatus } from 'armstock-shared';
import { SupplierService } from '../../services/SupplierService';
import type { ISupplierOption } from '../../interfaces/ISupplierOption';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The current choice, so its name shows before any search (it may be archived). */
  selected?: ISupplierOption | null;
  /** New documents may only pick active suppliers; filters may pick any. */
  activeOnly?: boolean;
  placeholder: string;
}>();

const model = defineModel<string>({ required: true });

const SEARCH_PAGE_SIZE = 20;

const options = ref<ISupplierOption[]>([]);
const isLoading = ref(false);
let lastRequest = 0;

const shownOptions = computed(() => {
  const current = props.selected;
  return current && !options.value.some((o) => o.uuid === current.uuid) ? [current, ...options.value] : options.value;
});

const search = async (query: string) => {
  const request = ++lastRequest;
  isLoading.value = true;
  try {
    const { items } = await SupplierService.list(1, SEARCH_PAGE_SIZE, {
      search: query.trim() || undefined,
      status: props.activeOnly ? SupplierStatus.ACTIVE : undefined,
    });
    // An older, slower answer must not replace a newer one.
    if (request === lastRequest) options.value = items.map((s) => ({ uuid: s.uuid, name: s.name }));
  } catch (error) {
    AppLogger.error('Failed to search suppliers:', error);
  } finally {
    if (request === lastRequest) isLoading.value = false;
  }
};

const onVisibleChange = (visible: boolean) => {
  if (visible && !options.value.length) search('');
};
</script>

<template>
  <el-select
    v-model="model"
    filterable
    remote
    clearable
    :value-on-clear="''"
    :remote-method="search"
    :loading="isLoading"
    :placeholder="placeholder"
    :aria-label="placeholder"
    @visible-change="onVisibleChange"
  >
    <el-option v-for="option in shownOptions" :key="option.uuid" :label="option.name" :value="option.uuid" />
  </el-select>
</template>
