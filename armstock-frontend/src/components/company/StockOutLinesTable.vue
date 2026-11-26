<script setup lang="ts">
import { ProductStatus, RECIPE_QUANTITY_DECIMALS, type IStockOutLine } from 'armstock-shared';
import CodeBadge from '../CodeBadge.vue';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{
  lines: IStockOutLine[];
  /** A document with recipes shows per product what the recipes needed, the extra part, and what was given. */
  withRecipes?: boolean;
}>();

const { unitShortName } = useMeasureUnits();
</script>

<template>
  <el-table :data="lines" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column type="index" label="#" width="48" align="center" />
    <el-table-column :label="$t('stockOut.lines.product')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.product.name }}</span>
        <el-tag v-if="row.product.status === ProductStatus.ARCHIVED" size="small" type="info" round class="lines-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.lines.code')" min-width="120">
      <template #default="{ row }">
        <CodeBadge v-if="row.product.code" :code="row.product.code" />
        <span v-else class="cell-text cell-text--muted">—</span>
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
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ formatQuantity(row.quantity) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.lines.unit')" min-width="70">
      <template #default="{ row }"><span class="cell-text cell-text--muted">{{ unitShortName(row.product.measureUnit) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.lines-table__tag {
  margin-left: 0.5rem;
}
</style>
