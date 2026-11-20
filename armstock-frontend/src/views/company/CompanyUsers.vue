<script setup lang="ts">
import { computed } from 'vue';
import { Permission } from 'armstock-shared';
import CompanyUsersManager from '../../components/company/CompanyUsersManager.vue';
import { CompanyUsersService } from '../../services/company/CompanyUsersService';
import { useAuthStore } from '../../stores/auth';
import type { IUsersAccess } from '../../interfaces/IUsersAccess';

const authStore = useAuthStore();

const access = computed<IUsersAccess>(() => ({
  canView: !!authStore.user?.can(Permission.USER_VIEW),
  canAdd: !!authStore.user?.can(Permission.USER_ADD),
  canEdit: !!authStore.user?.can(Permission.USER_EDIT),
  canManageAccess: !!authStore.user?.can(Permission.MANAGE_USER_PERMISSIONS),
  canEditOwner: false,
}));
</script>

<template>
  <CompanyUsersManager
    :api="CompanyUsersService"
    :access="access"
    :title="$t('companyUsers.title')"
    :subtitle="$t('companyUsers.subtitle')"
  />
</template>
