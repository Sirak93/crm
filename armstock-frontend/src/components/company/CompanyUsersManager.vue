<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserStatus, type ICompanyUser, type INamedRef, type IPaginationMeta, type IRole } from 'armstock-shared';
import { Plus, Users } from 'lucide-vue-next';
import PageHeader from '../PageHeader.vue';
import AppCard from '../AppCard.vue';
import LoadError from '../LoadError.vue';
import UsersTable from './UsersTable.vue';
import UserFilters from './UserFilters.vue';
import UserDialog from './UserDialog.vue';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';
import type { IUserFilters } from '../../interfaces/IUserFilters';
import type { IUsersAccess } from '../../interfaces/IUsersAccess';

/** A company's users page body - the company page and the Platform Owner's page pass their own `api` and `access`. */
const props = defineProps<{
  api: ICompanyUsersApi;
  access: IUsersAccess;
  title: string;
  subtitle?: string;
}>();

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();

const users = ref<ICompanyUser[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IUserFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const updatingUuid = ref<string | null>(null);
const currentUserUuid = computed(() => authStore.user?.uuid ?? null);
const hasFilters = computed(() => !!(filters.value.search || filters.value.status || filters.value.roleUuid));
const roles = ref<INamedRef[]>([]);
const roleTemplates = ref<IRole[]>([]);

const isDialogOpen = ref(false);
const editingUser = ref<ICompanyUser | null>(null);

const load = async (page = meta.value.page) => {
  // With only "add user", the list stays closed.
  if (!props.access.canView) return;
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await props.api.list(page, meta.value.pageSize, filters.value);
    users.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load company users:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

/** For the role picker and the role filter; with the right to manage permissions also each role's set. */
const loadRoles = async () => {
  try {
    if (props.access.canManageAccess && props.api.roleTemplates) {
      roleTemplates.value = await props.api.roleTemplates();
      roles.value = roleTemplates.value;
    } else {
      roles.value = await props.api.roles();
    }
  } catch (error) {
    AppLogger.error('Failed to load roles:', error);
    hasError.value = true;
  }
};

const retry = () => Promise.all([loadRoles(), load()]);

const onFiltersChange = (newFilters: IUserFilters) => {
  filters.value = newFilters;
  load(1);
};

const replaceRow = (updated: ICompanyUser) => {
  users.value = users.value.map((u) => (u.uuid === updated.uuid ? updated : u));
};

const openAdd = () => {
  editingUser.value = null;
  isDialogOpen.value = true;
};

const openEdit = (user: ICompanyUser) => {
  editingUser.value = user;
  isDialogOpen.value = true;
};

const onSaved = (saved: ICompanyUser) => {
  if (editingUser.value) {
    replaceRow(saved);
  } else {
    load(1);
  }
};

/** Stays on the same page unless it became empty. */
const reloadAfterRemoval = () => load(users.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page);

/** Statuses that take a user out of work ask first. */
const STATUS_CONFIRM: Partial<Record<UserStatus, { titleKey: string; textKey: string; buttonKey: string }>> = {
  [UserStatus.BLOCKED]: {
    titleKey: 'companyUsers.blockConfirmTitle',
    textKey: 'companyUsers.blockConfirmText',
    buttonKey: 'companyUsers.actions.block',
  },
  [UserStatus.ARCHIVED]: {
    titleKey: 'companyUsers.archiveConfirmTitle',
    textKey: 'companyUsers.archiveConfirmText',
    buttonKey: 'companyUsers.actions.archive',
  },
};

const STATUS_SUCCESS_KEY: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'companyUsers.activated',
  [UserStatus.BLOCKED]: 'companyUsers.blocked',
  [UserStatus.ARCHIVED]: 'companyUsers.archived',
};

const setStatus = async (user: ICompanyUser, status: UserStatus) => {
  const confirm = STATUS_CONFIRM[status];
  if (confirm) {
    const confirmed = await NotificationService.confirm(
      t(confirm.titleKey, { name: `${user.firstName} ${user.lastName}` }),
      t(confirm.textKey),
      t(confirm.buttonKey),
    );
    if (!confirmed) return;
  }

  updatingUuid.value = user.uuid;
  try {
    await props.api.setStatus(user.uuid, status);
    NotificationService.success(t(user.status === UserStatus.ARCHIVED ? 'companyUsers.restored' : STATUS_SUCCESS_KEY[status]));
    // The row may move in the status order or no longer match the filter.
    await (filters.value.status ? reloadAfterRemoval() : load());
  } catch (error) {
    NotificationService.error(parseError(error, 'companyUsers.saveError'));
  } finally {
    updatingUuid.value = null;
  }
};

onMounted(loadRoles);
</script>

<template>
  <section class="users-page">
    <PageHeader :title="title" :subtitle="subtitle" :badge="hasLoaded ? formatNumber(meta.total) : undefined">
      <template v-if="access.canAdd" #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('companyUsers.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <UserFilters v-if="access.canView" :roles="roles" @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('companyUsers.loadError')" @retry="retry" />

    <AppCard v-else-if="!access.canView" class="table-card">
      <el-empty :description="$t('companyUsers.addOnlyHint')">
        <template #image><Users :size="40" aria-hidden="true" /></template>
      </el-empty>
    </AppCard>

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!users.length" :description="$t(hasFilters ? 'companyUsers.noResults' : 'companyUsers.empty')">
        <template #image><Users :size="40" aria-hidden="true" /></template>
      </el-empty>

      <UsersTable
        v-else
        v-loading="isLoading"
        :users="users"
        :current-user-uuid="currentUserUuid"
        :updating-uuid="updatingUuid"
        :access="access"
        @edit="openEdit"
        @set-status="setStatus"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="users-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />

    <UserDialog
      v-model="isDialogOpen"
      :api="api"
      :user="editingUser"
      :current-user-uuid="currentUserUuid"
      :roles="roles"
      :role-templates="roleTemplates"
      :access="access"
      @saved="onSaved"
    />
  </section>
</template>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.users-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.users-pagination {
  justify-content: flex-end;
}
</style>
