<script setup lang="ts">
import type { IMeasureUnit } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';

defineProps<{
  units: IMeasureUnit[];
  /** False for read-only roles - no actions column. */
  canManage: boolean;
  /** uuid of the unit being deleted. */
  deletingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [unit: IMeasureUnit];
  delete: [unit: IMeasureUnit];
}>();

const onAction = (unit: IMeasureUnit, action: RowAction) => {
  if (action === ROW_ACTION.EDIT) emit('edit', unit);
  else emit('delete', unit);
};
</script>

<template>
  <el-table :data="units" class="app-table app-table--nowrap">
    <el-table-column prop="name" :label="$t('measureUnits.table.name')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column prop="shortName" :label="$t('measureUnits.table.shortName')" min-width="120">
      <template #default="{ row }"><span class="cell-text">{{ row.shortName }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('measureUnits.table.allowsDecimals')" min-width="140">
      <template #default="{ row }">
        <el-tag size="small" :type="row.allowsDecimals ? 'success' : 'info'" round>
          {{ $t(row.allowsDecimals ? 'common.yes' : 'common.no') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column v-if="canManage" min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('measureUnits.actionsFor', { name: row.name })"
          :disabled="deletingUuid === row.uuid"
          @command="(action) => onAction(row as IMeasureUnit, action as RowAction)"
        >
          <el-dropdown-item :command="ROW_ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('measureUnits.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item :command="ROW_ACTION.DELETE" class="dropdown-item--danger">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('measureUnits.actions.delete') }}</span>
          </el-dropdown-item>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
