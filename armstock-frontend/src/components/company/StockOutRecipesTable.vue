<script setup lang="ts">
import type { IStockOutRecipe } from 'armstock-shared';
import { Users } from 'lucide-vue-next';
import { formatNumber } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

/** A saved document's recipes - each with its saved ingredients (not the current recipe). */
defineProps<{
  recipes: IStockOutRecipe[];
}>();

const { formatRecipeAmount } = useMeasureUnits();
</script>

<template>
  <div class="out-recipes">
    <section v-for="row in recipes" :key="row.uuid" class="out-recipe" :aria-label="row.recipe.name">
      <header class="out-recipe__head">
        <h3 class="out-recipe__name">{{ row.recipe.name }}</h3>
        <span class="out-recipe__persons">
          <Users :size="14" aria-hidden="true" />
          {{ $t('stockOut.recipes.personCount', { count: formatNumber(row.persons) }) }}
        </span>
      </header>
      <ul class="out-recipe__lines">
        <li v-for="line in row.lines" :key="line.uuid" class="out-recipe__line">
          <span class="out-recipe__product">{{ line.product.name }}</span>
          <span class="out-recipe__leader" aria-hidden="true" />
          <span class="out-recipe__amount">{{ formatRecipeAmount(line.neededQuantity, line.product.measureUnit) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.out-recipes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem);
}

.out-recipe {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.out-recipe__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  padding: 0.625rem 0.875rem;
  background-color: var(--bg-app);
  border-bottom: 1px solid var(--border);
}

.out-recipe__name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.out-recipe__persons {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.out-recipe__lines {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  column-gap: 1.5rem;
  margin: 0;
  padding: 0.375rem 0.875rem;
  list-style: none;
}

.out-recipe__line {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.3125rem 0;
  font-size: var(--text-sm);
}

.out-recipe__product {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-main);
}

/* Dots from the name to the amount, like a menu - easy to read across. */
.out-recipe__leader {
  flex: 1;
  min-width: 1rem;
  border-bottom: 2px dotted var(--border-dark);
  transform: translateY(-0.25em);
}

.out-recipe__amount {
  flex-shrink: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
}
</style>
