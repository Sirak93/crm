<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserStatus, type ICompanyStaff, type IPaginationMeta } from 'armstock-shared';
import { Plus, Search, Users } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StaffTable from '../../components/company/StaffTable.vue';
import StaffDialog from '../../components/company/StaffDialog.vue';
import StaffLoginDialog from '../../components/company/StaffLoginDialog.vue';
import StaffRoleDialog from '../../components/company/StaffRoleDialog.vue';
import { CompanyStaffService } from '../../services/company/CompanyStaffService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();

const staff = ref<ICompanyStaff[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const updatingUuid = ref<string | null>(null);
const currentUserUuid = computed(() => authStore.user?.uuid ?? null);

const selected = ref<ICompanyStaff | null>(null);
const isStaffDialogOpen = ref(false);
const isLoginDialogOpen = ref(false);
const isRoleDialogOpen = ref(false);

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await CompanyStaffService.list(page, meta.value.pageSize, search.value.trim());
    staff.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load staff:', error);
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

const replaceRow = (updated: ICompanyStaff) => {
  staff.value = staff.value.map((s) => (s.uuid === updated.uuid ? updated : s));
};

const openAdd = () => {
  selected.value = null;
  isStaffDialogOpen.value = true;
};

const openEdit = (member: ICompanyStaff) => {
  selected.value = member;
  isStaffDialogOpen.value = true;
};

const openGiveLogin = (member: ICompanyStaff) => {
  selected.value = member;
  isLoginDialogOpen.value = true;
};

const openChangeRole = (member: ICompanyStaff) => {
  selected.value = member;
  isRoleDialogOpen.value = true;
};

const onStaffSaved = (saved: ICompanyStaff) => {
  if (selected.value) {
    replaceRow(saved);
  } else {
    search.value = '';
    load(1);
  }
};

const setLoginStatus = async (member: ICompanyStaff, status: UserStatus) => {
  const isBlock = status === UserStatus.BLOCKED;
  if (isBlock) {
    const confirmed = await NotificationService.confirm(
      t('company.staff.blockConfirmTitle', { name: `${member.firstName} ${member.lastName}` }),
      t('company.staff.blockConfirmText'),
      t('company.staff.actions.blockLogin'),
    );
    if (!confirmed) return;
  }

  updatingUuid.value = member.uuid;
  try {
    replaceRow(await CompanyStaffService.setLoginStatus(member.uuid, status));
    NotificationService.success(t(isBlock ? 'company.staff.loginBlocked' : 'company.staff.loginActivated'));
  } catch (error) {
    NotificationService.error(parseError(error, 'company.staff.saveError'));
  } finally {
    updatingUuid.value = null;
  }
};

onMounted(() => load(1));
</script>

<template>
  <section class="staff-page">
    <PageHeader
      :title="$t('company.staff.title')"
      :subtitle="$t('company.staff.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('company.staff.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('company.staff.searchPlaceholder')"
      :aria-label="$t('company.staff.searchPlaceholder')"
      clearable
      class="staff-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('company.staff.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty
        v-else-if="!staff.length"
        :description="$t(search.trim() ? 'company.staff.noResults' : 'company.staff.empty')"
      >
        <template #image><Users :size="40" aria-hidden="true" /></template>
      </el-empty>

      <StaffTable
        v-else
        v-loading="isLoading"
        :staff="staff"
        :current-user-uuid="currentUserUuid"
        :updating-uuid="updatingUuid"
        @edit="openEdit"
        @give-login="openGiveLogin"
        @change-role="openChangeRole"
        @set-login-status="setLoginStatus"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="staff-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />

    <StaffDialog v-model="isStaffDialogOpen" :staff="selected" @saved="onStaffSaved" />
    <StaffLoginDialog v-model="isLoginDialogOpen" :staff="selected" @saved="replaceRow" />
    <StaffRoleDialog v-model="isRoleDialogOpen" :staff="selected" @saved="replaceRow" />
  </section>
</template>

<style scoped>
.staff-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.staff-page > :deep(.page-header) {
  margin-bottom: 0;
}

.staff-search {
  max-width: 320px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.staff-pagination {
  justify-content: flex-end;
}
</style>
