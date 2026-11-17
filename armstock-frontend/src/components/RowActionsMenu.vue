<script setup lang="ts">
import { Ellipsis } from 'lucide-vue-next';

defineProps<{
  /** Accessible name of the "⋯" button, e.g. "Actions for Acme". */
  label: string;
  disabled?: boolean;
}>();

defineEmits<{ command: [command: string] }>();
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end" :disabled="disabled" @command="$emit('command', $event)">
    <button type="button" class="row-actions-btn" :disabled="disabled" :aria-label="label">
      <Ellipsis :size="18" aria-hidden="true" />
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <slot />
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.row-actions-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.row-actions-btn:hover:not(:disabled) {
  background-color: var(--bg-muted);
  color: var(--text-main);
}

.row-actions-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.row-actions-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}
</style>
