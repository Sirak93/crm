<script setup lang="ts">
import { ProductStatus, type IStockMovement } from 'armstock-shared';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{ rows: IStockMovement[] }>();

const { unitShortName } = useMeasureUnits();

const COLUMNS = [
  { key: 'initial', label: 'stockMovement.table.initial' },
  { key: 'incoming', label: 'stockMovement.table.in' },
  { key: 'outgoing', label: 'stockMovement.table.out' },
  { key: 'final', label: 'stockMovement.table.final' },
] as const;
</script>

<template>
  <el-table :data="rows" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column :label="$t('stockMovement.table.product')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.name }}</span>
        <span class="cell-text cell-text--muted"> ({{ unitShortName(row.measureUnit) }})</span>
        <el-tag v-if="row.status === ProductStatus.ARCHIVED" size="small" type="info" round class="movement-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column v-for="column in COLUMNS" :key="column.key" :label="$t(column.label)" min-width="110" align="right">
      <template #default="{ row }">
        <span class="cell-text" :class="{ 'cell-text--strong': column.key === 'final' }">{{ formatQuantity(row[column.key]) }}</span>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.movement-table__tag {
  margin-left: 0.5rem;
}
</style>
