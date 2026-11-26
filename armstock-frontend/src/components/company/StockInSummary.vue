<script setup lang="ts">
import type { IStockInSummary } from 'armstock-shared';
import { FileText, Package } from 'lucide-vue-next';
import StatCard from '../StatCard.vue';
import { formatNumber } from '../../utils/format';

defineProps<{
  summary: IStockInSummary;
  /** Dims the numbers while new ones load for changed filters. */
  isLoading: boolean;
}>();
</script>

<template>
  <div class="stock-in-summary" :class="{ 'stock-in-summary--loading': isLoading }" aria-live="polite">
    <StatCard :label="$t('stockIn.summary.documents')" :value="formatNumber(summary.documentCount)" :icon="FileText" color="primary" compact />
    <StatCard :label="$t('stockIn.summary.products')" :value="formatNumber(summary.productCount)" :icon="Package" color="info" compact />
  </div>
</template>

<style scoped>
.stock-in-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  transition: opacity 0.2s ease;
}

.stock-in-summary--loading {
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .stock-in-summary {
    transition: none;
  }
}
</style>
