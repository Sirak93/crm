<script setup lang="ts">
defineProps<{
  title: string;
  hint?: string;
  /** Adds the card's own padding - for cards whose content (a table) runs edge to edge. */
  inset?: boolean;
}>();
</script>

<template>
  <header :class="['section-header', { 'section-header--inset': inset }]">
    <span class="section-header__icon" aria-hidden="true"><slot name="icon" /></span>
    <div class="section-header__text">
      <h2 class="section-header__title">{{ title }}</h2>
      <p v-if="hint" class="section-header__hint">{{ hint }}</p>
    </div>
  </header>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  margin-bottom: 1rem;
}

.section-header--inset {
  margin-bottom: 0;
  padding: clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem) 0.75rem;
}

.section-header__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 1.75rem;
  color: var(--primary-dark);
}

.section-header__text {
  min-width: 0;
}

.section-header__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: 1.75rem;
  color: var(--text-main);
}

.section-header__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
