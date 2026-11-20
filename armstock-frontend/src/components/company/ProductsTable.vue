<script setup lang="ts">
import { ProductStatus, type IProduct } from 'armstock-shared';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-vue-next';
import CodeBadge from '../CodeBadge.vue';
import RowActionsMenu from '../RowActionsMenu.vue';
import { PRODUCT_STATUS_TAG } from '../../constants/statusTags';

defineProps<{
  products: IProduct[];
  /** False for read-only roles - no actions column. */
  canManage: boolean;
  /** uuid of the product being saved or deleted. */
  updatingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [product: IProduct];
  setStatus: [product: IProduct, status: ProductStatus];
  delete: [product: IProduct];
}>();

const ACTION = { EDIT: 'edit', ARCHIVE: 'archive', RESTORE: 'restore', DELETE: 'delete' } as const;
type Action = typeof ACTION[keyof typeof ACTION];

const onAction = (product: IProduct, action: Action) => {
  if (action === ACTION.EDIT) emit('edit', product);
  else if (action === ACTION.DELETE) emit('delete', product);
  else emit('setStatus', product, action === ACTION.ARCHIVE ? ProductStatus.ARCHIVED : ProductStatus.ACTIVE);
};
</script>

<template>
  <el-table :data="products" class="app-table app-table--nowrap">
    <el-table-column prop="name" :label="$t('products.table.name')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column prop="code" :label="$t('products.table.code')" min-width="130">
      <template #default="{ row }">
        <CodeBadge v-if="row.code" :code="row.code" />
        <span v-else class="cell-text cell-text--muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('products.table.category')" min-width="170" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text">{{ row.category.name }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('products.table.unit')" min-width="100">
      <template #default="{ row }"><span class="cell-text">{{ row.measureUnit.shortName }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('products.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="PRODUCT_STATUS_TAG[(row as IProduct).status].type" round>
          {{ $t(PRODUCT_STATUS_TAG[(row as IProduct).status].labelKey) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column v-if="canManage" min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('products.actionsFor', { name: row.name })"
          :disabled="updatingUuid === row.uuid"
          @command="(action) => onAction(row as IProduct, action as Action)"
        >
          <el-dropdown-item :command="ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('products.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-if="row.status === ProductStatus.ACTIVE" :command="ACTION.ARCHIVE">
            <Archive :size="16" aria-hidden="true" />
            <span>{{ $t('products.actions.archive') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-else :command="ACTION.RESTORE">
            <ArchiveRestore :size="16" aria-hidden="true" />
            <span>{{ $t('products.actions.restore') }}</span>
          </el-dropdown-item>
          <el-dropdown-item :command="ACTION.DELETE" class="dropdown-item--danger">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('products.actions.delete') }}</span>
          </el-dropdown-item>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
