<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { RECIPE_QUANTITY_DECIMALS } from 'armstock-shared';
import { Check, Pencil, Scale } from 'lucide-vue-next';
import SidePanel from '../SidePanel.vue';
import UnitAmountInput from '../UnitAmountInput.vue';
import StockOutTotalDiff from './StockOutTotalDiff.vue';
import type { IStockOutTotalRow } from '../../interfaces/IStockOutTotalRow';
import { formatQuantity } from '../../utils/format';
import { totalDifference } from '../../utils/stockOutTotals';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

/** The totals list as a panel: each product once, compact; a click on a product opens its total to change. */
const props = defineProps<{
  rows: IStockOutTotalRow[];
  /** The total of each product, by product uuid - undefined = cleared by the user. */
  totals: Record<string, number | undefined>;
  /** Highlight empty totals - set after a failed save. */
  showErrors: boolean;
}>();

const emit = defineEmits<{ update: [productUuid: string, value: number | undefined] }>();

const { unitShortName } = useMeasureUnits();

const editing = ref<string | null>(null);
const rowRefs = new Map<string, HTMLElement>();

const amount = (value: number, row: IStockOutTotalRow) =>
  `${formatQuantity(value, RECIPE_QUANTITY_DECIMALS)} ${unitShortName(row.product.measureUnit)}`;

const isEmpty = (row: IStockOutTotalRow) => props.totals[row.product.uuid] === undefined;
// An empty total stays open after a failed save, so it can be filled in at once.
const isOpen = (row: IStockOutTotalRow) => editing.value === row.product.uuid || (props.showErrors && isEmpty(row));

const toggle = async (row: IStockOutTotalRow) => {
  editing.value = editing.value === row.product.uuid ? null : row.product.uuid;
  if (!editing.value) return;
  await nextTick();
  rowRefs.get(row.product.uuid)?.querySelector('input')?.focus();
};

const close = () => {
  editing.value = null;
};

// Enter in the number field closes it; Enter in the unit picker still picks a unit.
const onEnter = (event: KeyboardEvent) => {
  if ((event.target as HTMLElement).closest('.unit-amount__number')) close();
};

const setRowRef = (uuid: string, el: unknown) => {
  if (el) rowRefs.set(uuid, el as HTMLElement);
  else rowRefs.delete(uuid);
};
</script>

<template>
  <SidePanel :title="$t('stockOut.totals.title')" :hint="$t('stockOut.totals.hint')">
    <template #icon><Scale :size="18" aria-hidden="true" /></template>

    <p v-if="!rows.length" class="totals-panel__empty">{{ $t('stockOut.totals.empty') }}</p>

    <ul v-else class="totals-panel__list">
      <li
        v-for="row in rows"
        :key="row.product.uuid"
        :ref="(el: unknown) => setRowRef(row.product.uuid, el)"
        :class="['totals-panel__row', { 'is-open': isOpen(row), 'is-invalid': showErrors && isEmpty(row) }]"
      >
        <button
          type="button"
          class="totals-panel__view"
          :aria-expanded="isOpen(row)"
          :aria-label="$t('stockOut.totals.editFor', { product: row.product.name })"
          @click="toggle(row)"
        >
          <span class="totals-panel__product">{{ row.product.name }}</span>
          <span class="totals-panel__leader" aria-hidden="true" />
          <span class="totals-panel__amount">
            {{ isEmpty(row) ? '—' : amount(totals[row.product.uuid]!, row) }}
          </span>
          <StockOutTotalDiff
            v-if="!isEmpty(row)"
            :difference="totalDifference(totals[row.product.uuid]!, row.needed, row.extra, row.product)"
            :unit="unitShortName(row.product.measureUnit)"
          />
          <Pencil :size="14" class="totals-panel__pencil" aria-hidden="true" />
        </button>

        <div v-if="isOpen(row)" class="totals-panel__edit" @keydown.enter="onEnter" @keydown.esc="close">
          <p v-if="row.needed || row.extra" class="totals-panel__parts">
            <span v-if="row.needed">{{ $t('stockOut.totals.neededPart', { amount: amount(row.needed, row) }) }}</span>
            <span v-if="row.extra">{{ $t('stockOut.totals.extraPart', { amount: amount(row.extra, row) }) }}</span>
          </p>
          <div class="totals-panel__field">
            <UnitAmountInput
              :model-value="totals[row.product.uuid]"
              :product-unit="row.product.measureUnit"
              :invalid="showErrors && isEmpty(row)"
              :label="$t('stockOut.totals.totalFor', { product: row.product.name })"
              @update:model-value="(value: number | undefined) => emit('update', row.product.uuid, value)"
            />
            <el-button
              circle
              type="primary"
              plain
              :aria-label="$t('common.ok')"
              @click="close"
            >
              <Check :size="16" aria-hidden="true" />
            </el-button>
          </div>
        </div>
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
  margin: 0 -0.5rem;
  border-radius: var(--radius);
}

.totals-panel__row.is-open {
  background-color: var(--bg-app);
}

.totals-panel__view {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  width: 100%;
  padding: 0.4375rem 0.5rem;
  border: 0;
  border-radius: var(--radius);
  background: none;
  font: inherit;
  font-size: var(--text-sm);
  text-align: left;
  color: var(--text-main);
  cursor: pointer;
}

.totals-panel__view:hover {
  background-color: var(--bg-app);
}

.totals-panel__view:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.totals-panel__product {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Dots from the name to the amount, like the summary panel. */
.totals-panel__leader {
  flex: 1;
  min-width: 1rem;
  border-bottom: 2px dotted var(--border-dark);
  transform: translateY(-0.25em);
}

.totals-panel__amount {
  flex-shrink: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.totals-panel__row.is-invalid .totals-panel__amount {
  color: var(--danger);
}

.totals-panel__pencil {
  flex-shrink: 0;
  align-self: center;
  color: var(--text-light);
}

.totals-panel__view:hover .totals-panel__pencil {
  color: var(--primary-dark);
}

.totals-panel__edit {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0 0.5rem 0.625rem;
}

.totals-panel__field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
