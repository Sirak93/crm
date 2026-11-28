<script setup lang="ts">
import { computed } from 'vue';
import type { MeasureUnit } from 'armstock-shared';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

const props = defineProps<{
  /** Total minus recipes + extras; nothing shows when 0. */
  difference: number;
  unit: MeasureUnit;
  /** Show the amount with its best-reading unit (panels); else the number only, as the table has a unit column. */
  autoUnit?: boolean;
}>();

const { unitShortName, formatAmount } = useMeasureUnits();

const sign = computed(() => (props.difference > 0 ? '+' : '−'));
const text = computed(() => `${sign.value}${props.autoUnit
  ? formatAmount(Math.abs(props.difference), props.unit)
  : formatQuantity(Math.abs(props.difference))}`);
const title = computed(() => (props.autoUnit ? text.value : `${text.value} ${unitShortName(props.unit)}`));
</script>

<template>
  <span
    v-if="difference"
    class="total-diff"
    :title="$t('stockOut.totals.changedBy', { amount: title })"
  >
    ({{ text }})
  </span>
</template>

<style scoped>
.total-diff {
  margin-left: 0.375rem;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--warning-dark);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
