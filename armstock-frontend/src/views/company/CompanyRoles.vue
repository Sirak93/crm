<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { lockedPermissions, type IRole } from 'armstock-shared';
import { Plus, Search, ShieldCheck } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import RolesTable from '../../components/company/RolesTable.vue';
import RoleDialog from '../../components/company/RoleDialog.vue';
import { RoleService } from '../../services/company/RoleService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();
const locked = computed(() => (authStore.user ? lockedPermissions(authStore.user.accountType) : []));

const roles = ref<IRole[]>([]);
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const deletingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingRole = ref<IRole | null>(null);

// A company has few roles, so the list is filtered here.
const filteredRoles = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return roles.value;
  return roles.value.filter((r) => r.name.toLowerCase().includes(term));
});

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    roles.value = await RoleService.list();
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load roles:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const openAdd = () => {
  editingRole.value = null;
  isDialogOpen.value = true;
};

const openEdit = (role: IRole) => {
  editingRole.value = role;
  isDialogOpen.value = true;
};

const deleteRole = async (role: IRole) => {
  // The server refuses too; this saves a pointless confirm.
  if (role.userCount) {
    NotificationService.error(t('errors.ROLE_IN_USE', { userCount: role.userCount }));
    return;
  }

  const confirmed = await NotificationService.confirm(
    t('roles.deleteConfirmTitle', { name: role.name }),
    t('roles.deleteConfirmText'),
    t('roles.actions.delete'),
  );
  if (!confirmed) return;

  deletingUuid.value = role.uuid;
  try {
    await RoleService.delete(role.uuid);
    roles.value = roles.value.filter((r) => r.uuid !== role.uuid);
    NotificationService.success(t('roles.deleted'));
  } catch (error) {
    NotificationService.error(parseError(error, 'roles.deleteError'));
  } finally {
    deletingUuid.value = null;
  }
};

onMounted(load);
</script>

<template>
  <section class="roles-page">
    <PageHeader
      :title="$t('roles.title')"
      :subtitle="$t('roles.subtitle')"
      :badge="hasLoaded ? formatNumber(roles.length) : undefined"
    >
      <template #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('roles.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('roles.searchPlaceholder')"
      :aria-label="$t('roles.searchPlaceholder')"
      clearable
      class="roles-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('roles.loadError')" @retry="load" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="4" animated class="skeleton" />

      <el-empty v-else-if="!filteredRoles.length" :description="$t(search.trim() ? 'roles.noResults' : 'roles.empty')">
        <template #image><ShieldCheck :size="40" aria-hidden="true" /></template>
      </el-empty>

      <RolesTable v-else v-loading="isLoading" :roles="filteredRoles" :deleting-uuid="deletingUuid" @edit="openEdit" @delete="deleteRole" />
    </AppCard>

    <RoleDialog v-model="isDialogOpen" :role="editingRole" :locked="locked" @saved="load" />
  </section>
</template>

<style scoped>
.roles-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.roles-page > :deep(.page-header) {
  margin-bottom: 0;
}

.roles-search {
  max-width: 320px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}
</style>
