<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserStatus, type ICompanyUser, type IPaginationMeta } from 'armstock-shared';
import { Plus, Search, Users } from 'lucide-vue-next';
import PageHeader from '../PageHeader.vue';
import AppCard from '../AppCard.vue';
import LoadError from '../LoadError.vue';
import UsersTable from './UsersTable.vue';
import UserDialog from './UserDialog.vue';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';

/** A company's users page body - the Platform Owner and the Company Owner pass their own `api`. */
const props = defineProps<{
  api: ICompanyUsersApi;
  title: string;
  subtitle?: string;
}>();

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();

const users = ref<ICompanyUser[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const updatingUuid = ref<string | null>(null);
const currentUserUuid = computed(() => authStore.user?.uuid ?? null);

const isDialogOpen = ref(false);
const editingUser = ref<ICompanyUser | null>(null);

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await props.api.list(page, meta.value.pageSize, search.value.trim());
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

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => load(1), SEARCH_DEBOUNCE_MS);
});

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
    search.value = '';
    load(1);
  }
};

const setStatus = async (user: ICompanyUser, status: UserStatus) => {
  const isBlock = status === UserStatus.BLOCKED;
  if (isBlock) {
    const confirmed = await NotificationService.confirm(
      t('companyUsers.blockConfirmTitle', { name: `${user.firstName} ${user.lastName}` }),
      t('companyUsers.blockConfirmText'),
      t('companyUsers.actions.block'),
    );
    if (!confirmed) return;
  }

  updatingUuid.value = user.uuid;
  try {
    replaceRow(await props.api.setStatus(user.uuid, status));
    NotificationService.success(t(isBlock ? 'companyUsers.blocked' : 'companyUsers.activated'));
  } catch (error) {
    NotificationService.error(parseError(error, 'companyUsers.saveError'));
  } finally {
    updatingUuid.value = null;
  }
};

onMounted(() => load(1));
</script>

<template>
  <section class="users-page">
    <PageHeader :title="title" :subtitle="subtitle" :badge="hasLoaded ? formatNumber(meta.total) : undefined">
      <template #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('companyUsers.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('companyUsers.searchPlaceholder')"
      :aria-label="$t('companyUsers.searchPlaceholder')"
      clearable
      class="users-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('companyUsers.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!users.length" :description="$t(search.trim() ? 'companyUsers.noResults' : 'companyUsers.empty')">
        <template #image><Users :size="40" aria-hidden="true" /></template>
      </el-empty>

      <UsersTable
        v-else
        v-loading="isLoading"
        :users="users"
        :current-user-uuid="currentUserUuid"
        :updating-uuid="updatingUuid"
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

    <UserDialog v-model="isDialogOpen" :api="api" :user="editingUser" :current-user-uuid="currentUserUuid" @saved="onSaved" />
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

.users-search {
  max-width: 320px;
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
