<script setup lang="ts">
import { computed, ref } from 'vue';
import type { INamedRef } from 'armstock-shared';
import { OptionsService } from '../../services/OptionsService';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The current choice, so its name shows before any search (it may be archived). */
  selected?: INamedRef | null;
  /** New documents may only pick active suppliers; filters may pick any. */
  activeOnly?: boolean;
  placeholder: string;
}>();

const model = defineModel<string>({ required: true });

const options = ref<INamedRef[]>([]);
const isLoading = ref(false);
let lastRequest = 0;

const shownOptions = computed(() => {
  const current = props.selected;
  return current && !options.value.some((o) => o.uuid === current.uuid) ? [current, ...options.value] : options.value;
});

// Element Plus calls this itself when the dropdown opens, so no extra call on open.
const search = async (query: string) => {
  const request = ++lastRequest;
  isLoading.value = true;
  try {
    const items = await OptionsService.suppliers(query.trim() || undefined, props.activeOnly);
    // An older, slower answer must not replace a newer one.
    if (request === lastRequest) options.value = items;
  } catch (error) {
    AppLogger.error('Failed to search suppliers:', error);
  } finally {
    if (request === lastRequest) isLoading.value = false;
  }
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
  >
    <el-option v-for="option in shownOptions" :key="option.uuid" :label="option.name" :value="option.uuid" />
  </el-select>
</template>
