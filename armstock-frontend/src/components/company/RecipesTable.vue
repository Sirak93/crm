<script setup lang="ts">
import type { IRecipe } from 'armstock-shared';
import { Eye, Pencil } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { RECIPE_STATUS_TAG } from '../../constants/statusTags';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';
import { formatNumber } from '../../utils/format';

defineProps<{
  recipes: IRecipe[];
  canEdit: boolean;
}>();

const emit = defineEmits<{
  view: [recipe: IRecipe];
  edit: [recipe: IRecipe];
}>();

const onAction = (recipe: IRecipe, action: RowAction) => {
  if (action === ROW_ACTION.EDIT) emit('edit', recipe);
  else emit('view', recipe);
};
</script>

<template>
  <el-table :data="recipes" class="app-table app-table--nowrap recipes-table" row-key="uuid" @row-click="(row: IRecipe) => emit('view', row)">
    <el-table-column prop="name" :label="$t('recipes.table.name')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('recipes.table.products')" min-width="100" align="right">
      <template #default="{ row }"><span class="cell-text">{{ formatNumber(row.lineCount) }}</span></template>
    </el-table-column>
    <el-table-column prop="note" :label="$t('recipes.table.note')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.note }]">{{ row.note || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('recipes.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="RECIPE_STATUS_TAG[(row as IRecipe).status].type" round>
          {{ $t(RECIPE_STATUS_TAG[(row as IRecipe).status].labelKey) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <!-- The menu has its own clicks; they must not also open the row. -->
        <div @click.stop>
          <RowActionsMenu
            :label="$t('recipes.actionsFor', { name: row.name })"
            @command="(action) => onAction(row as IRecipe, action as RowAction)"
          >
            <el-dropdown-item :command="ROW_ACTION.VIEW">
              <Eye :size="16" aria-hidden="true" />
              <span>{{ $t('recipes.actions.view') }}</span>
            </el-dropdown-item>
            <el-dropdown-item v-if="canEdit" :command="ROW_ACTION.EDIT">
              <Pencil :size="16" aria-hidden="true" />
              <span>{{ $t('recipes.actions.edit') }}</span>
            </el-dropdown-item>
          </RowActionsMenu>
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.recipes-table :deep(.el-table__row) {
  cursor: pointer;
}
</style>
