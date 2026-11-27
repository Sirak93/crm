<script setup lang="ts">
import { computed } from 'vue';
import { formatQuantity } from '../../utils/format';

const props = defineProps<{
  /** Total minus recipes + extras; nothing shows when 0. */
  difference: number;
  unit: string;
}>();

const text = computed(() => `${props.difference > 0 ? '+' : '−'}${formatQuantity(Math.abs(props.difference))}`);
</script>

<template>
  <span
    v-if="difference"
    class="total-diff"
    :title="$t('stockOut.totals.changedBy', { amount: `${text} ${unit}` })"
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
