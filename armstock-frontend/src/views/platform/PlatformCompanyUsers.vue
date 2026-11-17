<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ICompany } from 'armstock-shared';
import { ArrowLeft } from 'lucide-vue-next';
import CompanyUsersManager from '../../components/company/CompanyUsersManager.vue';
import LoadError from '../../components/LoadError.vue';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { ROUTE_NAME } from '../../constants/constants';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{ uuid: string }>();

const company = ref<ICompany | null>(null);
const hasError = ref(false);

const api: ICompanyUsersApi = {
  list: (page, pageSize, search) => PlatformCompaniesService.listUsers(props.uuid, page, pageSize, search),
  create: (payload) => PlatformCompaniesService.createUser(props.uuid, payload),
  update: (uuid, payload) => PlatformCompaniesService.updateUser(props.uuid, uuid, payload),
  setStatus: (uuid, status) => PlatformCompaniesService.setUserStatus(props.uuid, uuid, status),
};

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
