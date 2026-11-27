<script setup lang="ts">
import { ChefHat, ClipboardList, Package, Users } from 'lucide-vue-next';
import type { IStockOutPanelGroup } from '../../interfaces/IStockOutPanelGroup';
import { formatNumber, formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{
  groups: IStockOutPanelGroup[];
  recipeCount: number;
  productCount: number;
}>();

const { unitShortName, formatRecipeAmount } = useMeasureUnits();

const amountOf = (group: IStockOutPanelGroup, line: IStockOutPanelGroup['lines'][number]) => (group.persons
  ? formatRecipeAmount(line.quantity, line.product.measureUnit)
  : `${formatQuantity(line.quantity)} ${unitShortName(line.product.measureUnit)}`);
</script>

<template>
  <aside class="out-panel" :aria-label="$t('stockOut.panel.title')">
    <header class="out-panel__head">
      <h2 class="out-panel__title">
        <ClipboardList :size="18" aria-hidden="true" />
        {{ $t('stockOut.panel.title') }}
      </h2>
      <p class="out-panel__hint">{{ $t('stockOut.panel.hint') }}</p>
    </header>

    <div class="out-panel__body">
      <p v-if="!groups.length" class="out-panel__empty">{{ $t('stockOut.panel.empty') }}</p>

      <section v-for="group in groups" :key="group.key" class="out-group" :aria-label="group.name">
        <div class="out-group__head">
          <span class="out-group__icon" :class="{ 'out-group__icon--extra': !group.persons }" aria-hidden="true">
            <ChefHat v-if="group.persons" :size="16" />
            <Package v-else :size="16" />
          </span>
          <h3 class="out-group__name">{{ group.name }}</h3>
          <span v-if="group.persons" class="out-group__persons">
            <Users :size="13" aria-hidden="true" />
            {{ $t('stockOut.recipes.personCount', { count: formatNumber(group.persons) }) }}
          </span>
        </div>
        <ul class="out-group__lines">
          <li v-for="line in group.lines" :key="line.key" class="out-group__line">
            <span class="out-group__product">{{ line.product.name }}</span>
            <span class="out-group__leader" aria-hidden="true" />
            <span class="out-group__amount">{{ amountOf(group, line) }}</span>
          </li>
        </ul>
      </section>
    </div>

    <footer class="out-panel__foot">
      <dl class="out-panel__stats">
        <div class="out-panel__stat">
          <dt>{{ $t('stockOut.recipes.title') }}</dt>
          <dd>{{ formatNumber(recipeCount) }}</dd>
        </div>
        <div class="out-panel__stat">
          <dt>{{ $t('stockOut.panel.products') }}</dt>
          <dd>{{ formatNumber(productCount) }}</dd>
        </div>
      </dl>
      <slot name="actions" />
    </footer>
  </aside>
</template>

<style scoped>
.out-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}

.out-panel__head {
  padding: 1rem 1.125rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

.out-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.out-panel__hint {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.out-panel__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.125rem;
  overflow-y: auto;
}

.out-panel__empty {
  margin: 0;
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.out-group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
}

.out-group__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  color: var(--primary-dark);
  background-color: var(--primary-light);
}

.out-group__icon--extra {
  color: var(--warning-dark);
  background-color: var(--warning-light);
}

.out-group__name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  overflow-wrap: anywhere;
}

.out-group__persons {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-dark);
  background-color: var(--bg-app);
}

.out-group__lines {
  margin: 0;
  padding: 0 0 0 2.25rem;
  list-style: none;
}

.out-group__line {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: var(--text-sm);
}

.out-group__product {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-main);
}

/* Dots from the name to the amount, like a menu - easy to read across. */
.out-group__leader {
  flex: 1;
  min-width: 1rem;
  border-bottom: 2px dotted var(--border-dark);
  transform: translateY(-0.25em);
}

.out-group__amount {
  flex-shrink: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
}

.out-panel__foot {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem 1rem;
  border-top: 1px solid var(--border);
  background-color: var(--bg-app);
  border-radius: 0 0 var(--radius) var(--radius);
}

.out-panel__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 0;
}

.out-panel__stat {
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.out-panel__stat dt {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.out-panel__stat dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
}
</style>
