<script setup lang="ts">
import { RECIPE_QUANTITY_DECIMALS } from 'armstock-shared';
import { Scale } from 'lucide-vue-next';
import SidePanel from '../SidePanel.vue';
import UnitAmountInput from '../UnitAmountInput.vue';
import StockOutTotalDiff from './StockOutTotalDiff.vue';
import type { IStockOutTotalRow } from '../../interfaces/IStockOutTotalRow';
import { formatQuantity } from '../../utils/format';
import { totalDifference } from '../../utils/stockOutTotals';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

/** The totals list as a panel: each product once, its total editable - same rules as the totals table. */
defineProps<{
  rows: IStockOutTotalRow[];
  /** The total of each product, by product uuid - undefined = cleared by the user. */
  totals: Record<string, number | undefined>;
  /** Highlight empty totals - set after a failed save. */
  showErrors: boolean;
}>();

const emit = defineEmits<{ update: [productUuid: string, value: number | undefined] }>();

const { unitShortName } = useMeasureUnits();

const amount = (value: number, row: IStockOutTotalRow) =>
  `${formatQuantity(value, RECIPE_QUANTITY_DECIMALS)} ${unitShortName(row.product.measureUnit)}`;
</script>

<template>
  <SidePanel :title="$t('stockOut.totals.title')" :hint="$t('stockOut.totals.hint')">
    <template #icon><Scale :size="18" aria-hidden="true" /></template>

    <p v-if="!rows.length" class="totals-panel__empty">{{ $t('stockOut.totals.empty') }}</p>

    <ul v-else class="totals-panel__list">
      <li v-for="row in rows" :key="row.product.uuid" class="totals-panel__row">
        <div class="totals-panel__top">
          <span class="totals-panel__product">{{ row.product.name }}</span>
          <StockOutTotalDiff
            v-if="totals[row.product.uuid] !== undefined"
            :difference="totalDifference(totals[row.product.uuid]!, row.needed, row.extra, row.product)"
            :unit="unitShortName(row.product.measureUnit)"
          />
        </div>
        <p v-if="row.needed || row.extra" class="totals-panel__parts">
          <span v-if="row.needed">{{ $t('stockOut.totals.neededPart', { amount: amount(row.needed, row) }) }}</span>
          <span v-if="row.extra">{{ $t('stockOut.totals.extraPart', { amount: amount(row.extra, row) }) }}</span>
        </p>
        <UnitAmountInput
          :model-value="totals[row.product.uuid]"
          :product-unit="row.product.measureUnit"
          :invalid="showErrors && totals[row.product.uuid] === undefined"
          :label="$t('stockOut.totals.totalFor', { product: row.product.name })"
          @update:model-value="(value: number | undefined) => emit('update', row.product.uuid, value)"
        />
      </li>
    </ul>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </SidePanel>
</template>

<style scoped>
.totals-panel__empty {
  margin: 0;
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.totals-panel__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.totals-panel__row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.totals-panel__row:first-child {
  padding-top: 0;
}

.totals-panel__row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.totals-panel__top {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.totals-panel__product {
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
  overflow-wrap: anywhere;
}

.totals-panel__parts {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.75rem;
  margin: 0;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
</style>
