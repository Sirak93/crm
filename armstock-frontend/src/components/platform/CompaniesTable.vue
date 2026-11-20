<script setup lang="ts">
import { CompanyStatus, type ICompany } from 'armstock-shared';
import { Ban, CircleCheck, Pencil, Users } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { COMPANY_STATUS_TAG } from '../../constants/statusTags';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';

defineProps<{
  companies: ICompany[];
  /** uuid of the company whose status is saving. */
  updatingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [company: ICompany];
  users: [company: ICompany];
  setStatus: [company: ICompany, status: CompanyStatus];
}>();

const onAction = (company: ICompany, action: RowAction) => {
  if (action === ROW_ACTION.EDIT) emit('edit', company);
  else if (action === ROW_ACTION.USERS) emit('users', company);
  else emit('setStatus', company, action === ROW_ACTION.BLOCK ? CompanyStatus.BLOCKED : CompanyStatus.ACTIVE);
};
</script>

<template>
  <el-table :data="companies" class="app-table app-table--nowrap companies-table">
    <el-table-column prop="name" :label="$t('platform.companies.table.name')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column prop="taxId" :label="$t('platform.companies.table.taxId')" min-width="130" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.taxId }]">{{ row.taxId || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="phone" :label="$t('platform.companies.table.phone')" min-width="140" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.phone }]">{{ row.phone || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="email" :label="$t('platform.companies.table.email')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.email }]">{{ row.email || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="address" :label="$t('platform.companies.table.address')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.address }]">{{ row.address || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('platform.companies.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="COMPANY_STATUS_TAG[row.status as CompanyStatus].type" round>
          {{ $t(COMPANY_STATUS_TAG[row.status as CompanyStatus].labelKey) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('platform.companies.actionsFor', { name: row.name })"
          :disabled="updatingUuid === row.uuid"
          @command="(action) => onAction(row as ICompany, action as RowAction)"
        >
          <el-dropdown-item :command="ROW_ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('platform.companies.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item :command="ROW_ACTION.USERS">
            <Users :size="16" aria-hidden="true" />
            <span>{{ $t('platform.companies.actions.users') }}</span>
          </el-dropdown-item>
          <el-dropdown-item
            v-if="row.status === CompanyStatus.ACTIVE"
            :command="ROW_ACTION.BLOCK"
            class="dropdown-item--danger"
          >
            <Ban :size="16" aria-hidden="true" />
            <span>{{ $t('platform.companies.actions.block') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-else :command="ROW_ACTION.ACTIVATE">
            <CircleCheck :size="16" aria-hidden="true" />
            <span>{{ $t('platform.companies.actions.activate') }}</span>
          </el-dropdown-item>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
