<script setup lang="ts">
import type { IStockInSummary } from 'armstock-shared';
import { formatMoney, formatNumber } from '../../utils/format';

defineProps<{
  summary: IStockInSummary;
  /** Dims the numbers while new ones load for changed filters. */
  isLoading: boolean;
}>();
</script>

<template>
  <dl class="stock-in-summary" :class="{ 'stock-in-summary--loading': isLoading }" aria-live="polite">
    <div class="stock-in-summary__item">
      <dt>{{ $t('stockIn.summary.documents') }}</dt>
      <dd>{{ formatNumber(summary.documentCount) }}</dd>
    </div>
    <div class="stock-in-summary__item">
      <dt>{{ $t('stockIn.summary.products') }}</dt>
      <dd>{{ formatNumber(summary.productCount) }}</dd>
    </div>
    <div class="stock-in-summary__item stock-in-summary__item--total">
      <dt>{{ $t('stockIn.summary.total') }}</dt>
      <dd>{{ formatMoney(summary.total) }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.stock-in-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin: 0;
  padding: 0.625rem 1rem;
  border: 1px solid var(--border-dark);
  border-radius: var(--radius);
  background-color: var(--bg-card);
  transition: opacity 0.2s ease;
}

.stock-in-summary--loading {
  opacity: 0.5;
}

.stock-in-summary__item {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.stock-in-summary__item--total {
  margin-left: auto;
}

.stock-in-summary dt {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.stock-in-summary dd {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
}

.stock-in-summary__item--total dd {
  font-size: var(--text-lg);
  color: var(--primary-dark);
}

@media (max-width: 576px) {
  .stock-in-summary__item--total {
    margin-left: 0;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stock-in-summary {
    transition: none;
  }
}
</style>
