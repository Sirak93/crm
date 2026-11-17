<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <section class="app-card">
    <h2 v-if="title" class="app-card__title">{{ title }}</h2>
    <slot />
  </section>
</template>

<style scoped>
.app-card {
  padding: clamp(0.75rem, 2vw, 1.25rem);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.app-card__title {
  margin: 0 0 1rem;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-main);
}
</style>
