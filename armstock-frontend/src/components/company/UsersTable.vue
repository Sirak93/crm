<script setup lang="ts">
import { AccountType, UserStatus, type ICompanyUser } from 'armstock-shared';
import { Archive, ArchiveRestore, Ban, CircleCheck, Pencil } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { USER_STATUS_TAG } from '../../constants/statusTags';
import { ROW_ACTION, type RowAction } from '../../constants/rowActions';
import type { IUsersAccess } from '../../interfaces/IUsersAccess';

const props = defineProps<{
  users: ICompanyUser[];
  /** The logged-in user - they cannot change their own status. */
  currentUserUuid: string | null;
  /** uuid of the user whose status is saving. */
  updatingUuid: string | null;
  access: IUsersAccess;
}>();

const emit = defineEmits<{
  edit: [user: ICompanyUser];
  setStatus: [user: ICompanyUser, status: UserStatus];
}>();

const STATUS_BY_ACTION: Partial<Record<RowAction, UserStatus>> = {
  [ROW_ACTION.BLOCK]: UserStatus.BLOCKED,
  [ROW_ACTION.ACTIVATE]: UserStatus.ACTIVE,
  [ROW_ACTION.ARCHIVE]: UserStatus.ARCHIVED,
  [ROW_ACTION.RESTORE]: UserStatus.ACTIVE,
};

const isSelf = (user: ICompanyUser) => user.uuid === props.currentUserUuid;
const isOwner = (user: ICompanyUser) => user.accountType === AccountType.COMPANY_OWNER;

/** Basic data, login, and status - the Owner account only from the platform side. */
const canEditRow = (user: ICompanyUser) => (isOwner(user) ? props.access.canEditOwner : props.access.canEdit);
const canOpenEdit = (user: ICompanyUser) => canEditRow(user) || (props.access.canChangeRole && !isOwner(user) && !isSelf(user));
const canChangeStatus = (user: ICompanyUser) => canEditRow(user) && !isSelf(user);

const onAction = (user: ICompanyUser, action: RowAction) => {
  const status = STATUS_BY_ACTION[action];
  if (action === ROW_ACTION.EDIT) emit('edit', user);
  else if (status) emit('setStatus', user, status);
};
</script>

<template>
  <el-table :data="users" class="app-table app-table--nowrap">
    <el-table-column :label="$t('companyUsers.table.name')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.firstName }} {{ row.lastName }}</span></template>
    </el-table-column>
    <el-table-column prop="position" :label="$t('companyUsers.table.position')" min-width="150" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.position }]">{{ row.position || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('companyUsers.table.role')" min-width="150">
      <template #default="{ row }">
        <span class="role-cell">
          <el-tag v-if="isOwner(row as ICompanyUser)" size="small" type="primary" round>{{ $t('companyUsers.owner') }}</el-tag>
          <span v-else class="cell-text">{{ row.role?.name ?? '—' }}</span>
          <el-tag v-if="!row.canLogIn" size="small" type="info" round>{{ $t('companyUsers.noLogin') }}</el-tag>
        </span>
      </template>
    </el-table-column>
    <el-table-column prop="email" :label="$t('companyUsers.table.email')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.email }]">{{ row.email || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('companyUsers.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="USER_STATUS_TAG[(row as ICompanyUser).status].type" round>
          {{ $t(USER_STATUS_TAG[(row as ICompanyUser).status].labelKey) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          v-if="canOpenEdit(row as ICompanyUser) || canChangeStatus(row as ICompanyUser)"
          :label="$t('companyUsers.actionsFor', { name: `${row.firstName} ${row.lastName}` })"
          :disabled="updatingUuid === row.uuid"
          @command="(action) => onAction(row as ICompanyUser, action as RowAction)"
        >
          <el-dropdown-item v-if="canOpenEdit(row as ICompanyUser)" :command="ROW_ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('companyUsers.actions.edit') }}</span>
          </el-dropdown-item>
          <template v-if="canChangeStatus(row as ICompanyUser)">
            <el-dropdown-item v-if="row.status === UserStatus.ARCHIVED" :command="ROW_ACTION.RESTORE">
              <ArchiveRestore :size="16" aria-hidden="true" />
              <span>{{ $t('companyUsers.actions.restore') }}</span>
            </el-dropdown-item>
            <template v-else>
              <el-dropdown-item v-if="row.status === UserStatus.ACTIVE" :command="ROW_ACTION.BLOCK" class="dropdown-item--danger">
                <Ban :size="16" aria-hidden="true" />
                <span>{{ $t('companyUsers.actions.block') }}</span>
              </el-dropdown-item>
              <el-dropdown-item v-else :command="ROW_ACTION.ACTIVATE">
                <CircleCheck :size="16" aria-hidden="true" />
                <span>{{ $t('companyUsers.actions.activate') }}</span>
              </el-dropdown-item>
              <el-dropdown-item :command="ROW_ACTION.ARCHIVE">
                <Archive :size="16" aria-hidden="true" />
                <span>{{ $t('companyUsers.actions.archive') }}</span>
              </el-dropdown-item>
            </template>
          </template>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.role-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
