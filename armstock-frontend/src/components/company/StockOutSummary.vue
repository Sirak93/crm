<script setup lang="ts">
import type { IStockOutSummary } from 'armstock-shared';
import { FileText, Package } from 'lucide-vue-next';
import StatCard from '../StatCard.vue';
import { formatNumber } from '../../utils/format';

defineProps<{
  summary: IStockOutSummary;
  /** Dims the numbers while new ones load for changed filters. */
  isLoading: boolean;
}>();
</script>

<template>
  <div class="stock-out-summary" :class="{ 'stock-out-summary--loading': isLoading }" aria-live="polite">
    <StatCard :label="$t('stockOut.summary.documents')" :value="formatNumber(summary.documentCount)" :icon="FileText" color="primary" compact />
    <StatCard :label="$t('stockOut.summary.products')" :value="formatNumber(summary.productCount)" :icon="Package" color="info" compact />
  </div>
</template>

<style scoped>
.stock-out-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  transition: opacity 0.2s ease;
}

.stock-out-summary--loading {
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .stock-out-summary {
    transition: none;
  }
}
</style>
