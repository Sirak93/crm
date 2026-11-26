<script setup lang="ts">
import { RECIPE_QUANTITY_DECIMALS } from 'armstock-shared';
import CodeBadge from '../CodeBadge.vue';
import UnitAmountInput from '../UnitAmountInput.vue';
import type { IStockOutTotalRow } from '../../interfaces/IStockOutTotalRow';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

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
  value ? `${formatQuantity(value, RECIPE_QUANTITY_DECIMALS)} ${unitShortName(row.product.measureUnit)}` : '—';
</script>

<template>
  <div class="totals-table">
    <div class="totals-table__head">
      <h2 class="totals-table__title">{{ $t('stockOut.totals.title') }}</h2>
      <p class="totals-table__hint">{{ $t('stockOut.totals.hint') }}</p>
    </div>

    <el-table :data="rows" class="app-table" row-key="product.uuid" :empty-text="$t('stockOut.totals.empty')">
      <el-table-column type="index" label="#" width="48" align="center" />
      <el-table-column :label="$t('stockOut.totals.product')" min-width="220">
        <template #default="{ row }">
          <span class="cell-text">{{ row.product.name }}</span>
          <CodeBadge v-if="row.product.code" :code="row.product.code" class="totals-table__code" />
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.totals.needed')" min-width="120" align="right">
        <template #default="{ row }">
          <span class="cell-text totals-table__number">{{ amount(row.needed, row as IStockOutTotalRow) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.totals.extra')" min-width="110" align="right">
        <template #default="{ row }">
          <span class="cell-text totals-table__number">{{ amount(row.extra, row as IStockOutTotalRow) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.totals.total')" min-width="200">
        <template #default="{ row }">
          <UnitAmountInput
            :model-value="totals[row.product.uuid]"
            :product-unit="row.product.measureUnit"
            :invalid="showErrors && totals[row.product.uuid] === undefined"
            :label="$t('stockOut.totals.totalFor', { product: row.product.name })"
            @update:model-value="(value: number | undefined) => emit('update', row.product.uuid, value)"
          />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.totals-table__head {
  padding: 0.875rem clamp(0.75rem, 2vw, 1.25rem) 0.5rem;
}

.totals-table__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.totals-table__hint {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.totals-table__code {
  margin-left: 0.5rem;
}

.totals-table__number {
  font-variant-numeric: tabular-nums;
}
</style>
