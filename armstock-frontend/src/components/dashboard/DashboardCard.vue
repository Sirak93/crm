<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { ChevronRight } from 'lucide-vue-next';
import AppCard from '../AppCard.vue';
import LoadError from '../LoadError.vue';

defineProps<{
  title: string;
  isLoading?: boolean;
  hasError?: boolean;
  /** "View all" link in the header. */
  to?: RouteLocationRaw;
}>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <AppCard class="dashboard-card">
    <header class="dashboard-card__head">
      <h2 class="dashboard-card__title">{{ title }}</h2>
      <router-link v-if="to" :to="to" class="dashboard-card__link">
        <span>{{ $t('dashboard.viewAll') }}</span>
        <ChevronRight :size="16" aria-hidden="true" />
      </router-link>
    </header>

    <LoadError v-if="hasError && !isLoading" :message="$t('dashboard.cardError')" @retry="$emit('retry')" />
    <el-skeleton v-else-if="isLoading" :rows="2" animated />
    <slot v-else />
  </AppCard>
</template>

<style scoped>
.dashboard-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}

.dashboard-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.dashboard-card__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-main);
}

.dashboard-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
}

.dashboard-card__link:hover {
  text-decoration: underline;
}
</style>
