<script setup lang="ts" generic="T extends number">
import { computed, type Component } from 'vue';

/** A reason dropdown with an icon next to each choice and the picked one. */
const props = defineProps<{
  options: { value: T; label: string; icon: Component }[];
  /** Read out by screen readers. */
  label: string;
  disabled?: boolean;
}>();

const value = defineModel<T>({ required: true });

const current = computed(() => props.options.find((option) => option.value === value.value));
</script>

<template>
  <el-select v-model="value" :disabled="disabled" :aria-label="label" class="reason-select">
    <template v-if="current" #prefix>
      <component :is="current.icon" :size="16" aria-hidden="true" class="reason-select__icon" />
    </template>
    <el-option v-for="option in options" :key="option.value" :label="option.label" :value="option.value">
      <span class="reason-select__option">
        <component :is="option.icon" :size="16" aria-hidden="true" class="reason-select__icon" />
        {{ option.label }}
      </span>
    </el-option>
  </el-select>
</template>

<style scoped>
.reason-select__option {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.reason-select__icon {
  flex-shrink: 0;
  color: var(--primary-dark);
}
</style>
