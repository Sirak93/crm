<script setup lang="ts">
import type { IStockBalanceSummary } from 'armstock-shared';
import { Banknote, Package } from 'lucide-vue-next';
import StatCard from '../StatCard.vue';
import { formatApproxMoney, formatNumber } from '../../utils/format';

defineProps<{
  summary: IStockBalanceSummary;
  /** Dims the numbers while new ones load for changed filters. */
  isLoading: boolean;
}>();
</script>

<template>
  <div class="stock-balance-summary" :class="{ 'stock-balance-summary--loading': isLoading }" aria-live="polite">
    <StatCard
      :label="$t('stockBalance.summary.totalValue')"
      :value="formatApproxMoney(summary.totalValue)"
      :icon="Banknote"
      color="success"
      compact
    />
    <StatCard
      :label="$t('stockBalance.summary.products')"
      :value="formatNumber(summary.productCount)"
      :icon="Package"
      color="info"
      compact
    />
  </div>
</template>

<style scoped>
.stock-balance-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  transition: opacity 0.2s ease;
}

.stock-balance-summary--loading {
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .stock-balance-summary {
    transition: none;
  }
}
</style>
