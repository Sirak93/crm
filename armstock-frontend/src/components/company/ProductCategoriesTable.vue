<script setup lang="ts">
import type { IProductCategory } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';

defineProps<{
  categories: IProductCategory[];
  canEdit: boolean;
  canDelete: boolean;
  /** uuid of the category being deleted. */
  deletingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [category: IProductCategory];
  delete: [category: IProductCategory];
}>();

const onAction = (category: IProductCategory, action: RowAction) => {
  if (action === ROW_ACTION.EDIT) emit('edit', category);
  else emit('delete', category);
};
</script>

<template>
  <el-table :data="categories" class="app-table app-table--nowrap">
    <el-table-column prop="name" :label="$t('productCategories.table.name')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column v-if="canEdit || canDelete" min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('productCategories.actionsFor', { name: row.name })"
          :disabled="deletingUuid === row.uuid"
          @command="(action) => onAction(row as IProductCategory, action as RowAction)"
        >
          <el-dropdown-item v-if="canEdit" :command="ROW_ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('productCategories.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-if="canDelete" :command="ROW_ACTION.DELETE" class="dropdown-item--danger">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('productCategories.actions.delete') }}</span>
          </el-dropdown-item>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
