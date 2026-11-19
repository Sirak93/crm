<script setup lang="ts">
import { ProductStatus, type IStockInLine } from 'armstock-shared';
import { formatMoney, formatQuantity } from '../../utils/format';

defineProps<{
  lines: IStockInLine[];
}>();
</script>

<template>
  <el-table :data="lines" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column type="index" label="#" width="48" align="center" />
    <el-table-column :label="$t('stockIn.lines.product')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.productName }}</span>
        <span v-if="row.productCode" class="cell-text cell-text--muted lines-table__code">{{ row.productCode }}</span>
        <el-tag v-if="row.productStatus === ProductStatus.ARCHIVED" size="small" type="info" round class="lines-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.lines.quantity')" min-width="110" align="right">
      <template #default="{ row }"><span class="cell-text">{{ formatQuantity(row.quantity) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.lines.unit')" min-width="70">
      <template #default="{ row }"><span class="cell-text cell-text--muted">{{ row.unitShortName }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.lines.price')" min-width="120" align="right">
      <template #default="{ row }"><span class="cell-text">{{ formatMoney(row.price) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.lines.total')" min-width="130" align="right">
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ formatMoney(row.total) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.lines-table__code {
  margin-left: 0.5rem;
}

.lines-table__tag {
  margin-left: 0.5rem;
}
</style>
