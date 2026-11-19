<script setup lang="ts">
import { SupplierStatus, type ISupplier, type ISupplierContact } from 'armstock-shared';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import SupplierDetails from './SupplierDetails.vue';
import { SUPPLIER_STATUS_TAG } from '../../constants/statusTags';

defineProps<{
  suppliers: ISupplier[];
  /** uuid of the supplier being saved or deleted. */
  busyUuid: string | null;
  /** uuid of the contact being deleted. */
  deletingContactUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [supplier: ISupplier];
  setStatus: [supplier: ISupplier, status: SupplierStatus];
  delete: [supplier: ISupplier];
  addContact: [supplier: ISupplier];
  editContact: [supplier: ISupplier, contact: ISupplierContact];
  deleteContact: [supplier: ISupplier, contact: ISupplierContact];
}>();

const ACTION = { EDIT: 'edit', ARCHIVE: 'archive', RESTORE: 'restore', DELETE: 'delete' } as const;
type Action = typeof ACTION[keyof typeof ACTION];

const onAction = (supplier: ISupplier, action: Action) => {
  if (action === ACTION.EDIT) emit('edit', supplier);
  else if (action === ACTION.DELETE) emit('delete', supplier);
  else emit('setStatus', supplier, action === ACTION.ARCHIVE ? SupplierStatus.ARCHIVED : SupplierStatus.ACTIVE);
};
</script>

<template>
  <el-table :data="suppliers" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column type="expand">
      <template #default="{ row }">
        <SupplierDetails
          :supplier="row as ISupplier"
          :deleting-contact-uuid="deletingContactUuid"
          @add-contact="emit('addContact', row as ISupplier)"
          @edit-contact="(contact) => emit('editContact', row as ISupplier, contact)"
          @delete-contact="(contact) => emit('deleteContact', row as ISupplier, contact)"
        />
      </template>
    </el-table-column>

    <el-table-column prop="name" :label="$t('suppliers.table.name')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column prop="taxId" :label="$t('suppliers.table.taxId')" min-width="120">
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.taxId }]">{{ row.taxId || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="note" :label="$t('suppliers.table.note')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.note }]">{{ row.note || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('suppliers.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="SUPPLIER_STATUS_TAG[(row as ISupplier).status].type" round>
          {{ $t(SUPPLIER_STATUS_TAG[(row as ISupplier).status].labelKey) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('suppliers.actionsFor', { name: row.name })"
          :disabled="busyUuid === row.uuid"
          @command="(action) => onAction(row as ISupplier, action as Action)"
        >
          <el-dropdown-item :command="ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('suppliers.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-if="row.status === SupplierStatus.ACTIVE" :command="ACTION.ARCHIVE">
            <Archive :size="16" aria-hidden="true" />
            <span>{{ $t('suppliers.actions.archive') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-else :command="ACTION.RESTORE">
            <ArchiveRestore :size="16" aria-hidden="true" />
            <span>{{ $t('suppliers.actions.restore') }}</span>
          </el-dropdown-item>
          <el-dropdown-item :command="ACTION.DELETE" class="dropdown-item--danger">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('suppliers.actions.delete') }}</span>
          </el-dropdown-item>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.app-table :deep(.el-table__expanded-cell) {
  padding: 0;
  background-color: var(--bg-app);
}
</style>
