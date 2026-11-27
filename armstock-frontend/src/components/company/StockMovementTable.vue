<script setup lang="ts">
import { ProductStatus, type IStockMovement } from 'armstock-shared';
import { Eye, FileSpreadsheet } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';
import { formatQuantity } from '../../utils/format';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{ rows: IStockMovement[] }>();

const emit = defineEmits<{ view: [row: IStockMovement]; export: [row: IStockMovement] }>();

const onAction = (row: IStockMovement, action: RowAction) => {
  if (action === ROW_ACTION.EXPORT) emit('export', row);
  else emit('view', row);
};

const { unitShortName } = useMeasureUnits();

const COLUMNS = [
  { key: 'initial', label: 'stockMovement.table.initial' },
  { key: 'incoming', label: 'stockMovement.table.in' },
  { key: 'outgoing', label: 'stockMovement.table.out' },
  { key: 'final', label: 'stockMovement.table.final' },
] as const;
</script>

<template>
  <el-table :data="rows" class="app-table app-table--nowrap movement-table" row-key="uuid" @row-click="(row: IStockMovement) => emit('view', row)">
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
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <div @click.stop>
          <RowActionsMenu :label="$t('stockMovement.actionsFor', { name: row.name })" @command="onAction(row as IStockMovement, $event as RowAction)">
            <el-dropdown-item :command="ROW_ACTION.VIEW">
              <Eye :size="16" aria-hidden="true" />
              <span>{{ $t('stockMovement.actions.view') }}</span>
            </el-dropdown-item>
            <el-dropdown-item :command="ROW_ACTION.EXPORT">
              <FileSpreadsheet :size="16" aria-hidden="true" />
              <span>{{ $t('stockMovement.actions.export') }}</span>
            </el-dropdown-item>
          </RowActionsMenu>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.movement-table :deep(.el-table__row) {
  cursor: pointer;
}

.movement-table__tag {
  margin-left: 0.5rem;
}
</style>
