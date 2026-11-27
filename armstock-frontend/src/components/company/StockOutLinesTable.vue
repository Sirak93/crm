<script setup lang="ts">
import { ProductStatus, RECIPE_QUANTITY_DECIMALS, type IStockOutLine } from 'armstock-shared';
import StockOutTotalDiff from './StockOutTotalDiff.vue';
import { formatQuantity } from '../../utils/format';
import { totalDifference } from '../../utils/stockOutTotals';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

const props = defineProps<{
  lines: IStockOutLine[];
  /** A document with recipes shows per product what the recipes needed, the extra part, and what was given. */
  withRecipes?: boolean;
  /** The product hovered here or in the summary panel. */
  highlighted?: string | null;
}>();

const emit = defineEmits<{ hover: [productUuid: string | null] }>();

const rowClass = ({ row }: { row: IStockOutLine }) => (row.product.uuid === props.highlighted ? 'is-highlighted' : '');

const { unitShortName } = useMeasureUnits();
</script>

<template>
  <el-table
    :data="lines"
    class="app-table app-table--nowrap lines-table"
    row-key="uuid"
    :row-class-name="rowClass"
    @cell-mouse-enter="(row: IStockOutLine) => emit('hover', row.product.uuid)"
    @cell-mouse-leave="() => emit('hover', null)"
  >
    <el-table-column type="index" label="#" width="48" align="center" />
    <el-table-column :label="$t('stockOut.lines.product')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.product.name }}</span>
        <el-tag v-if="row.product.status === ProductStatus.ARCHIVED" size="small" type="info" round class="lines-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <template v-if="withRecipes">
      <el-table-column :label="$t('stockOut.totals.needed')" min-width="110" align="right">
        <template #default="{ row }">
          <span class="cell-text">{{ row.neededQuantity ? formatQuantity(row.neededQuantity, RECIPE_QUANTITY_DECIMALS) : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.totals.extra')" min-width="100" align="right">
        <template #default="{ row }"><span class="cell-text">{{ row.extraQuantity ? formatQuantity(row.extraQuantity) : '—' }}</span></template>
      </el-table-column>
    </template>
    <el-table-column :label="$t(withRecipes ? 'stockOut.totals.total' : 'stockOut.lines.quantity')" min-width="110" align="right">
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ formatQuantity(row.quantity) }}</span>
        <StockOutTotalDiff
          v-if="withRecipes"
          :difference="totalDifference(row.quantity, row.neededQuantity, row.extraQuantity, row.product)"
          :unit="unitShortName(row.product.measureUnit)"
        />
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.lines.unit')" min-width="70">
      <template #default="{ row }"><span class="cell-text cell-text--muted">{{ unitShortName(row.product.measureUnit) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.lines-table :deep(.el-table__row.is-highlighted > td.el-table__cell) {
  background-color: var(--primary-light);
}

.lines-table__tag {
  margin-left: 0.5rem;
}
</style>
