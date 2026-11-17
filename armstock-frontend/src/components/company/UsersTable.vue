<script setup lang="ts">
import { UserStatus, type ICompanyUser } from 'armstock-shared';
import { Ban, CircleCheck, Pencil } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { USER_STATUS_TAG } from '../../constants/statusTags';
import { ROLE_LABEL_KEY } from '../../constants/roleLabels';

const props = defineProps<{
  users: ICompanyUser[];
  /** The logged-in user - they cannot block themselves. */
  currentUserUuid: string | null;
  /** uuid of the user whose status is saving. */
  updatingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [user: ICompanyUser];
  setStatus: [user: ICompanyUser, status: UserStatus];
}>();

const ACTION = { EDIT: 'edit', BLOCK: 'block', ACTIVATE: 'activate' } as const;
type Action = typeof ACTION[keyof typeof ACTION];

const isSelf = (user: ICompanyUser) => user.uuid === props.currentUserUuid;

const onAction = (user: ICompanyUser, action: Action) => {
  if (action === ACTION.EDIT) emit('edit', user);
  else emit('setStatus', user, action === ACTION.BLOCK ? UserStatus.BLOCKED : UserStatus.ACTIVE);
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
      <template #default="{ row }"><span class="cell-text">{{ $t(ROLE_LABEL_KEY[(row as ICompanyUser).role]) }}</span></template>
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
          :label="$t('companyUsers.actionsFor', { name: `${row.firstName} ${row.lastName}` })"
          :disabled="updatingUuid === row.uuid"
          @command="(action) => onAction(row as ICompanyUser, action as Action)"
        >
          <el-dropdown-item :command="ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('companyUsers.actions.edit') }}</span>
          </el-dropdown-item>
          <template v-if="!isSelf(row as ICompanyUser)">
            <el-dropdown-item v-if="row.status === UserStatus.ACTIVE" :command="ACTION.BLOCK" class="dropdown-item--danger">
              <Ban :size="16" aria-hidden="true" />
              <span>{{ $t('companyUsers.actions.block') }}</span>
            </el-dropdown-item>
            <el-dropdown-item v-else :command="ACTION.ACTIVATE">
              <CircleCheck :size="16" aria-hidden="true" />
              <span>{{ $t('companyUsers.actions.activate') }}</span>
            </el-dropdown-item>
          </template>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
