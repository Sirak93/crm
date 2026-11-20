<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ICompany } from 'armstock-shared';
import { ArrowLeft } from 'lucide-vue-next';
import CompanyUsersManager from '../../components/company/CompanyUsersManager.vue';
import LoadError from '../../components/LoadError.vue';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { ROUTE_NAME } from '../../constants/constants';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';
import type { IUsersAccess } from '../../interfaces/IUsersAccess';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{ uuid: string }>();

const company = ref<ICompany | null>(null);
const hasError = ref(false);

const api: ICompanyUsersApi = {
  list: (page, pageSize, filters) => PlatformCompaniesService.listUsers(props.uuid, page, pageSize, filters),
  create: (payload) => PlatformCompaniesService.createUser(props.uuid, payload),
  update: (uuid, payload) => PlatformCompaniesService.updateUser(props.uuid, uuid, payload),
  setStatus: (uuid, status) => PlatformCompaniesService.setUserStatus(props.uuid, uuid, status),
  roles: () => PlatformCompaniesService.listRoles(props.uuid),
};

// Roles and permissions from the platform side come later; the Owner account is managed only here.
const access: IUsersAccess = { canView: true, canAdd: true, canEdit: true, canChangeRole: false, canEditOwner: true };

const loadCompany = async () => {
  hasError.value = false;
  try {
    company.value = await PlatformCompaniesService.get(props.uuid);
  } catch (error) {
    AppLogger.error('Failed to load the company:', error);
    hasError.value = true;
  }
};

onMounted(loadCompany);
</script>

<template>
  <div class="company-users">
    <router-link :to="{ name: ROUTE_NAME.PLATFORM_COMPANIES }" class="back-link">
      <ArrowLeft :size="16" aria-hidden="true" />
      <span>{{ $t('platform.companies.backToCompanies') }}</span>
    </router-link>

    <LoadError v-if="hasError" :message="$t('platform.companies.loadOneError')" @retry="loadCompany" />
    <el-skeleton v-else-if="!company" :rows="6" animated />
    <CompanyUsersManager
      v-else
      :api="api"
      :access="access"
      :title="company.name"
      :subtitle="$t('platform.companies.usersSubtitle')"
    />
  </div>
</template>

<style scoped>
.company-users {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  transition: var(--transition);
}

.back-link:hover {
  color: var(--primary);
}

.back-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
