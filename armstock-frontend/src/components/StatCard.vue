<script setup lang="ts">
import type { Component } from 'vue';

export type StatCardColor = 'primary' | 'info' | 'success' | 'warning' | 'danger';

defineProps<{
  label: string;
  value: string;
  icon: Component;
  color: StatCardColor;
  hint?: string;
  /** Icon beside the text instead of above it - for a short row of numbers over a list. */
  compact?: boolean;
}>();
</script>

<template>
  <div class="stat-card" :class="{ 'stat-card--compact': compact }">
    <span class="stat-card__icon" :class="`stat-card__icon--${color}`">
      <component :is="icon" :size="18" aria-hidden="true" />
    </span>
    <div class="stat-card__body">
      <p class="stat-card__value">{{ value }}</p>
      <p class="stat-card__label">{{ label }}</p>
      <p v-if="hint" class="stat-card__hint">{{ hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  height: 100%;
  padding: 1rem;
  background-color: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.stat-card--compact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
}

.stat-card__body {
  min-width: 0;
}

.stat-card__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  border-radius: 10px;
}

.stat-card--compact .stat-card__icon {
  flex-shrink: 0;
  margin-bottom: 0;
}

.stat-card--compact .stat-card__value {
  margin-bottom: 0;
  font-size: var(--text-lg);
}

.stat-card--compact .stat-card__label {
  margin-bottom: 0;
  font-size: var(--text-xs);
}

.stat-card__icon--primary { color: var(--primary); background-color: var(--primary-light); }
.stat-card__icon--info { color: var(--info); background-color: var(--info-light); }
.stat-card__icon--success { color: var(--success); background-color: var(--success-light); }
.stat-card__icon--warning { color: var(--warning); background-color: var(--warning-light); }
.stat-card__icon--danger { color: var(--danger); background-color: var(--danger-light); }

.stat-card__value {
  margin: 0 0 0.25rem;
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card__label {
  margin: 0 0 0.25rem;
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-card__hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
