<script setup lang="ts">
import { PERMISSION_GROUPS, type IRole } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';
import { formatNumber } from '../../utils/format';

defineProps<{
  roles: IRole[];
  /** uuid of the role being deleted. */
  deletingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [role: IRole];
  delete: [role: IRole];
}>();

const PERMISSION_TOTAL = PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0);

const onAction = (role: IRole, action: RowAction) => {
  if (action === ROW_ACTION.EDIT) emit('edit', role);
  else emit('delete', role);
};
</script>

<template>
  <el-table :data="roles" class="app-table app-table--nowrap">
    <el-table-column prop="name" :label="$t('roles.table.name')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('roles.table.permissions')" min-width="140">
      <template #default="{ row }">
        <span class="cell-text">{{ $t('permissions.count', { on: row.permissions.length, total: PERMISSION_TOTAL }) }}</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('roles.table.users')" min-width="100">
      <template #default="{ row }"><span class="cell-text">{{ formatNumber(row.userCount) }}</span></template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('roles.actionsFor', { name: row.name })"
          :disabled="deletingUuid === row.uuid"
          @command="(action) => onAction(row as IRole, action as RowAction)"
        >
          <el-dropdown-item :command="ROW_ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('roles.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item :command="ROW_ACTION.DELETE" class="dropdown-item--danger">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('roles.actions.delete') }}</span>
          </el-dropdown-item>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
