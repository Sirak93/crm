<script setup lang="ts">
import { UserStatus, type ICompanyStaff } from 'armstock-shared';
import { Ban, CircleCheck, KeyRound, Pencil, UserCog } from 'lucide-vue-next';
import RowActionsMenu from '../RowActionsMenu.vue';
import { USER_STATUS_TAG } from '../../constants/statusTags';
import { ROLE_LABEL_KEY } from '../../constants/roleLabels';

const props = defineProps<{
  staff: ICompanyStaff[];
  /** The logged-in user - their own login cannot be changed here. */
  currentUserUuid: string | null;
  /** uuid of the staff member whose login status is saving. */
  updatingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [staff: ICompanyStaff];
  giveLogin: [staff: ICompanyStaff];
  changeRole: [staff: ICompanyStaff];
  setLoginStatus: [staff: ICompanyStaff, status: UserStatus];
}>();

const ACTION = {
  EDIT: 'edit',
  GIVE_LOGIN: 'giveLogin',
  CHANGE_ROLE: 'changeRole',
  BLOCK: 'block',
  ACTIVATE: 'activate',
} as const;
type Action = typeof ACTION[keyof typeof ACTION];

const isOwnLogin = (staff: ICompanyStaff) => !!staff.login && staff.login.uuid === props.currentUserUuid;

const onAction = (staff: ICompanyStaff, action: Action) => {
  if (action === ACTION.EDIT) emit('edit', staff);
  else if (action === ACTION.GIVE_LOGIN) emit('giveLogin', staff);
  else if (action === ACTION.CHANGE_ROLE) emit('changeRole', staff);
  else emit('setLoginStatus', staff, action === ACTION.BLOCK ? UserStatus.BLOCKED : UserStatus.ACTIVE);
};
</script>

<template>
  <el-table :data="staff" class="app-table app-table--nowrap staff-table">
    <el-table-column :label="$t('company.staff.table.name')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.firstName }} {{ row.lastName }}</span></template>
    </el-table-column>
    <el-table-column prop="position" :label="$t('company.staff.table.position')" min-width="150" show-overflow-tooltip>
      <template #default="{ row }"><span :class="['cell-text', { 'cell-text--muted': !row.position }]">{{ row.position || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('company.staff.table.login')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }">
        <span v-if="row.login" class="cell-text">{{ row.login.email }}</span>
        <span v-else class="cell-text cell-text--muted">{{ $t('company.staff.noLogin') }}</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('company.staff.table.role')" min-width="150">
      <template #default="{ row }">
        <span v-if="row.login" class="cell-text">{{ $t(ROLE_LABEL_KEY[(row as ICompanyStaff).login!.role]) }}</span>
        <span v-else class="cell-text cell-text--muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('company.staff.table.loginStatus')" min-width="130">
      <template #default="{ row }">
        <el-tag v-if="row.login" size="small" :type="USER_STATUS_TAG[(row as ICompanyStaff).login!.status].type" round>
          {{ $t(USER_STATUS_TAG[(row as ICompanyStaff).login!.status].labelKey) }}
        </el-tag>
        <span v-else class="cell-text cell-text--muted">—</span>
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <RowActionsMenu
          :label="$t('company.staff.actionsFor', { name: `${row.firstName} ${row.lastName}` })"
          :disabled="updatingUuid === row.uuid"
          @command="(action) => onAction(row as ICompanyStaff, action as Action)"
        >
          <el-dropdown-item :command="ACTION.EDIT">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('company.staff.actions.edit') }}</span>
          </el-dropdown-item>
          <el-dropdown-item v-if="!row.login" :command="ACTION.GIVE_LOGIN">
            <KeyRound :size="16" aria-hidden="true" />
            <span>{{ $t('company.staff.actions.giveLogin') }}</span>
          </el-dropdown-item>
          <template v-else-if="!isOwnLogin(row as ICompanyStaff)">
            <el-dropdown-item :command="ACTION.CHANGE_ROLE">
              <UserCog :size="16" aria-hidden="true" />
              <span>{{ $t('company.staff.actions.changeRole') }}</span>
            </el-dropdown-item>
            <el-dropdown-item
              v-if="row.login.status === UserStatus.ACTIVE"
              :command="ACTION.BLOCK"
              class="dropdown-item--danger"
            >
              <Ban :size="16" aria-hidden="true" />
              <span>{{ $t('company.staff.actions.blockLogin') }}</span>
            </el-dropdown-item>
            <el-dropdown-item v-else :command="ACTION.ACTIVATE">
              <CircleCheck :size="16" aria-hidden="true" />
              <span>{{ $t('company.staff.actions.activateLogin') }}</span>
            </el-dropdown-item>
          </template>
        </RowActionsMenu>
      </template>
    </el-table-column>
  </el-table>
</template>
