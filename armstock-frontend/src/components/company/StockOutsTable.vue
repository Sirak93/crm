<script setup lang="ts">
import type { IStockOut } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import RecipeIcon from './RecipeIcon.vue';
import RowActionsMenu from '../RowActionsMenu.vue';
import { ROUTE_NAME } from '../../constants/constants';
import { stockOutDestination } from '../../utils/stockOutDestination';
import { formatDateTimeShort, formatNumber } from '../../utils/format';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';
import { useStockReasons } from '../../composables/useStockReasons';

const { stockOutReasonName, departmentName } = useStockReasons();

defineProps<{
  stockOuts: IStockOut[];
  /** Only the creator may edit or delete a document, each with its own permission. */
  currentUserUuid: string | null;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
  /** uuid of the document being deleted. */
  busyUuid: string | null;
}>();

const emit = defineEmits<{
  open: [stockOut: IStockOut];
  edit: [stockOut: IStockOut];
  delete: [stockOut: IStockOut];
}>();

const onAction = (stockOut: IStockOut, action: RowAction) => {
  if (action === ROW_ACTION.EDIT) emit('edit', stockOut);
  else emit('delete', stockOut);
};

const destination = (doc: IStockOut): string => stockOutDestination(doc, departmentName);
</script>

<template>
  <el-table :data="stockOuts" class="app-table app-table--nowrap stock-outs-table" row-key="uuid" @row-click="(row: IStockOut) => emit('open', row)">
    <el-table-column :label="$t('stockOut.table.number')" min-width="150">
      <template #default="{ row }">
        <router-link
          :to="{ name: ROUTE_NAME.COMPANY_STOCK_OUT, params: { uuid: row.uuid } }"
          class="cell-text cell-text--strong stock-outs-table__link"
          @click.stop
        >
          {{ row.number }}
        </router-link>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.table.date')" min-width="140">
      <template #default="{ row }"><span class="cell-text">{{ formatDateTimeShort(row.date) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.table.reason')" min-width="160">
      <template #default="{ row }">
        <span class="stock-outs-table__reason">
          <span class="cell-text">{{ stockOutReasonName((row as IStockOut).reason) }}</span>
          <RecipeIcon v-if="row.hasRecipes" />
        </span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.table.destination')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }">
        <span :class="['cell-text', { 'cell-text--muted': !destination(row as IStockOut) }]">{{ destination(row as IStockOut) || '—' }}</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.table.products')" min-width="100" align="right">
      <template #default="{ row }"><span class="cell-text">{{ formatNumber(row.productCount) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.table.createdBy')" min-width="150" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text">{{ row.createdBy.name }}</span></template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <div @click.stop>
          <RowActionsMenu
            v-if="(canEditOwn || canDeleteOwn) && row.createdBy.uuid === currentUserUuid"
            :label="$t('stockOut.actionsFor', { number: row.number })"
            :disabled="busyUuid === row.uuid"
            @command="(action) => onAction(row as IStockOut, action as RowAction)"
          >
            <el-dropdown-item v-if="canEditOwn" :command="ROW_ACTION.EDIT">
              <Pencil :size="16" aria-hidden="true" />
              <span>{{ $t('stockOut.actions.edit') }}</span>
            </el-dropdown-item>
            <el-dropdown-item v-if="canDeleteOwn" :command="ROW_ACTION.DELETE" class="dropdown-item--danger">
              <Trash2 :size="16" aria-hidden="true" />
              <span>{{ $t('stockOut.actions.delete') }}</span>
            </el-dropdown-item>
          </RowActionsMenu>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.stock-outs-table :deep(.el-table__row) {
  cursor: pointer;
}

.stock-outs-table__link {
  color: var(--primary-dark);
  text-decoration: none;
}

.stock-outs-table__link:hover {
  text-decoration: underline;
}

.stock-outs-table__reason {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.stock-outs-table__link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
