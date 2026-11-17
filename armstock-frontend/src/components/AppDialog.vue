<script setup lang="ts">
import { X } from 'lucide-vue-next';

withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  width?: string;
  /** Blocks closing (e.g. while saving). */
  locked?: boolean;
}>(), {
  subtitle: '',
  width: '520px',
  locked: false,
});

const open = defineModel<boolean>({ required: true });
</script>

<template>
  <el-dialog
    v-model="open"
    :width="width"
    class="app-dialog"
    align-center
    destroy-on-close
    :show-close="false"
    :close-on-click-modal="!locked"
    :close-on-press-escape="!locked"
  >
    <template #header>
      <div class="app-dialog__header">
        <div v-if="$slots.icon" class="app-dialog__icon" aria-hidden="true">
          <slot name="icon" />
        </div>
        <div class="app-dialog__heading">
          <h2 class="app-dialog__title">{{ title }}</h2>
          <p v-if="subtitle" class="app-dialog__subtitle">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="app-dialog__close"
          :aria-label="$t('common.close')"
          :disabled="locked"
          @click="open = false"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
    </template>

    <slot />

    <template v-if="$slots.footer" #footer>
      <div class="app-dialog__footer">
        <slot name="footer" />
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.app-dialog__header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.app-dialog__icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background-color: var(--primary-light);
  color: var(--primary);
}

.app-dialog__heading {
  flex: 1;
  min-width: 0;
}

.app-dialog__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 800;
  line-height: 1.3;
  color: var(--text-main);
  overflow-wrap: anywhere;
}

.app-dialog__subtitle {
  margin: 0.125rem 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.app-dialog__close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 10px;
  background-color: var(--bg-muted);
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.app-dialog__close:hover:not(:disabled) {
  background-color: var(--border-dark);
  color: var(--text-main);
  transform: rotate(90deg);
}

.app-dialog__close:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.app-dialog__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (prefers-reduced-motion: reduce) {
  .app-dialog__close:hover:not(:disabled) {
    transform: none;
  }
}
</style>
