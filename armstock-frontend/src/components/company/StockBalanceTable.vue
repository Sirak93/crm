<script setup lang="ts">
import { ProductStatus, type IStockBalance } from 'armstock-shared';
import CodeBadge from '../CodeBadge.vue';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{
  balances: IStockBalance[];
  /** Most decimals shown - the kitchen balance has up to 6 (recipe needs). */
  decimals?: number;
}>();

const { unitShortName } = useMeasureUnits();
</script>

<template>
  <el-table :data="balances" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column :label="$t('stockBalance.table.product')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.name }}</span>
        <el-tag v-if="row.status === ProductStatus.ARCHIVED" size="small" type="info" round class="balance-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.code')" min-width="120">
      <template #default="{ row }">
        <CodeBadge v-if="row.code" :code="row.code" />
        <span v-else class="cell-text cell-text--muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.category')" min-width="160" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text">{{ row.categoryName }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.quantity')" min-width="110" align="right">
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ formatQuantity(row.quantity, decimals) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.unit')" min-width="70">
      <template #default="{ row }"><span class="cell-text cell-text--muted">{{ unitShortName(row.measureUnit) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.balance-table__tag {
  margin-left: 0.5rem;
}
</style>
