<script setup lang="ts">
import type { IStockIn } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { ROUTE_NAME } from '../../constants/constants';
import { STOCK_IN_REASON_LABEL } from '../../constants/stockInReasons';
import { formatDateTimeShort, formatMoney } from '../../utils/format';

defineProps<{
  stockIns: IStockIn[];
  /** Only the creator may edit or delete a document. */
  currentUserUuid: string | null;
  /** uuid of the document being deleted. */
  busyUuid: string | null;
}>();

const emit = defineEmits<{
  open: [stockIn: IStockIn];
  edit: [stockIn: IStockIn];
  delete: [stockIn: IStockIn];
}>();

const ACTION = { EDIT: 'edit', DELETE: 'delete' } as const;
type Action = typeof ACTION[keyof typeof ACTION];

const onAction = (stockIn: IStockIn, action: Action) => {
  if (action === ACTION.EDIT) emit('edit', stockIn);
  else emit('delete', stockIn);
};
</script>

<template>
  <el-table :data="stockIns" class="app-table app-table--nowrap stock-ins-table" row-key="uuid" @row-click="(row: IStockIn) => emit('open', row)">
    <el-table-column :label="$t('stockIn.table.number')" min-width="140">
      <template #default="{ row }">
        <router-link
          :to="{ name: ROUTE_NAME.COMPANY_STOCK_IN, params: { uuid: row.uuid } }"
          class="cell-text cell-text--strong stock-ins-table__link"
          @click.stop
        >
          {{ row.number }}
        </router-link>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.table.date')" min-width="140">
      <template #default="{ row }"><span class="cell-text">{{ formatDateTimeShort(row.date) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.table.reason')" min-width="120">
      <template #default="{ row }"><span class="cell-text">{{ $t(STOCK_IN_REASON_LABEL[(row as IStockIn).reason]) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.table.supplier')" min-width="180" show-overflow-tooltip>
      <template #default="{ row }">
        <span :class="['cell-text', { 'cell-text--muted': !row.supplierName }]">{{ row.supplierName || '—' }}</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.table.total')" min-width="130" align="right">
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ formatMoney(row.total) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockIn.table.createdBy')" min-width="150" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text">{{ row.createdByName }}</span></template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <div @click.stop>
          <RowActionsMenu
            v-if="row.createdByUuid === currentUserUuid"
            :label="$t('stockIn.actionsFor', { number: row.number })"
            :disabled="busyUuid === row.uuid"
            @command="(action) => onAction(row as IStockIn, action as Action)"
          >
            <el-dropdown-item :command="ACTION.EDIT">
              <Pencil :size="16" aria-hidden="true" />
              <span>{{ $t('stockIn.actions.edit') }}</span>
            </el-dropdown-item>
            <el-dropdown-item :command="ACTION.DELETE" class="dropdown-item--danger">
              <Trash2 :size="16" aria-hidden="true" />
              <span>{{ $t('stockIn.actions.delete') }}</span>
            </el-dropdown-item>
          </RowActionsMenu>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.stock-ins-table :deep(.el-table__row) {
  cursor: pointer;
}

.stock-ins-table__link {
  color: var(--primary-dark);
  text-decoration: none;
}

.stock-ins-table__link:hover {
  text-decoration: underline;
}

.stock-ins-table__link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
