<script setup lang="ts">
import type { IStockLineProduct } from 'armstock-shared';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

/** A recipe's worked-out amounts as one line of "Product amount" pairs, in the recipe's small unit (500 մլ). */
defineProps<{
  lines: { uuid: string; product: IStockLineProduct; neededQuantity: number }[];
}>();

const { formatRecipeAmount } = useMeasureUnits();
</script>

<template>
  <ul v-if="lines.length" class="recipe-amounts">
    <li v-for="line in lines" :key="line.uuid">
      <span class="recipe-amounts__product">{{ line.product.name }}</span>
      <span class="recipe-amounts__amount">{{ formatRecipeAmount(line.neededQuantity, line.product.measureUnit) }}</span>
    </li>
  </ul>
  <span v-else class="cell-text cell-text--muted">—</span>
</template>

<style scoped>
.recipe-amounts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.875rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
}

.recipe-amounts__product {
  color: var(--text-muted);
}

.recipe-amounts__amount {
  margin-left: 0.25rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
}
</style>
