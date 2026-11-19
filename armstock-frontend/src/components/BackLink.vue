<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';

defineProps<{
  to: RouteLocationRaw;
  label: string;
}>();
</script>

<template>
  <router-link :to="to" class="back-link">
    <ArrowLeft :size="16" aria-hidden="true" />
    <span>{{ label }}</span>
  </router-link>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  align-self: flex-start;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
}

.back-link:hover {
  color: var(--primary-dark);
}

.back-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
