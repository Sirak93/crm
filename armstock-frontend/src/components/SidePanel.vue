<script setup lang="ts">
defineProps<{
  title: string;
  hint?: string;
  /** Marks the panel as the main one to act on - primary border and tinted header. */
  accent?: boolean;
}>();
</script>

<template>
  <aside :class="['side-panel', { 'side-panel--accent': accent }]" :aria-label="title">
    <header class="side-panel__head">
      <h2 class="side-panel__title">
        <slot name="icon" />
        {{ title }}
      </h2>
      <p v-if="hint" class="side-panel__hint">{{ hint }}</p>
    </header>

    <div class="side-panel__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="side-panel__foot">
      <slot name="footer" />
    </footer>
  </aside>
</template>

<style scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}

.side-panel__head {
  padding: 1rem 1.125rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

.side-panel--accent {
  border-color: var(--primary);
}

.side-panel--accent .side-panel__head {
  background-color: var(--primary-light);
  border-bottom-color: var(--primary);
  border-radius: var(--radius) var(--radius) 0 0;
}

.side-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.side-panel__hint {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.side-panel__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  padding: 1rem 1.125rem;
  overflow-y: auto;
}

.side-panel__foot {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem 1rem;
  border-top: 1px solid var(--border);
  background-color: var(--bg-app);
  border-radius: 0 0 var(--radius) var(--radius);
}
</style>
