<script setup lang="ts">
import { convertQuantity, ProductStatus, QUANTITY_DECIMALS, type IStockInLine, type MeasureUnit } from 'armstock-shared';
import CodeBadge from '../CodeBadge.vue';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{
  lines: IStockInLine[];
}>();

const { unitShortName } = useMeasureUnits();

// Room for the unit typed in being smaller than the product's (0.5 լ → 500 մլ).
const TYPED_DECIMALS = QUANTITY_DECIMALS * 2;

const amount = (value: number, unit: MeasureUnit) => `${formatQuantity(value)} ${unitShortName(unit)}`;

/** Count 1 → the amount as typed (12.4 կգ); more → 500 մլ × 6 = 3 լ. */
const lineText = (line: IStockInLine): string => {
  const typed = amount(convertQuantity(line.packQuantity, line.product.measureUnit, line.packUnit, TYPED_DECIMALS), line.packUnit);
  if (line.packCount === 1) return typed;
  return `${typed} × ${formatQuantity(line.packCount)} = ${amount(line.quantity, line.product.measureUnit)}`;
};
</script>

<template>
  <el-table :data="lines" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column type="index" label="#" width="48" align="center" />
    <el-table-column :label="$t('stockIn.lines.product')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.product.name }}</span>
        <el-tag v-if="row.product.status === ProductStatus.ARCHIVED" size="small" type="info" round class="lines-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.lines.code')" min-width="120">
      <template #default="{ row }">
        <CodeBadge v-if="row.product.code" :code="row.product.code" />
        <span v-else class="cell-text cell-text--muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.lines.quantity')" min-width="180" align="right">
      <template #default="{ row }"><span class="cell-text">{{ lineText(row as IStockInLine) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.lines-table__tag {
  margin-left: 0.5rem;
}
</style>
