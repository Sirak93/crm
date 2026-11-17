<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ICompany, IPaginationMeta } from 'armstock-shared';
import { Building2, Plus, Search } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import CompaniesTable from '../../components/platform/CompaniesTable.vue';
import CompanyDialog from '../../components/platform/CompanyDialog.vue';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const companies = ref<ICompany[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const togglingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingCompany = ref<ICompany | null>(null);

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await PlatformCompaniesService.list(page, meta.value.pageSize, search.value.trim());
    companies.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load companies:', error);
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

const openAdd = () => {
  editingCompany.value = null;
  isDialogOpen.value = true;
};

const openEdit = (company: ICompany) => {
  editingCompany.value = company;
  isDialogOpen.value = true;
};

const onSaved = (saved: ICompany) => {
  if (editingCompany.value) {
    companies.value = companies.value.map((c) => (c.uuid === saved.uuid ? saved : c));
  } else {
    search.value = '';
    load(1);
  }
};

const toggleActive = async (company: ICompany, isActive: boolean) => {
  if (!isActive) {
    const confirmed = await NotificationService.confirm(
      t('platform.companies.turnOffConfirmTitle', { name: company.name }),
      t('platform.companies.turnOffConfirmText'),
      t('platform.companies.turnOff'),
    );
    if (!confirmed) return;
  }

  togglingUuid.value = company.uuid;
  try {
    const updated = await PlatformCompaniesService.setActive(company.uuid, isActive);
    companies.value = companies.value.map((c) => (c.uuid === updated.uuid ? updated : c));
    NotificationService.success(t(isActive ? 'platform.companies.turnedOn' : 'platform.companies.turnedOff'));
  } catch (error) {
    NotificationService.error(parseError(error, 'platform.companies.saveError'));
  } finally {
    togglingUuid.value = null;
  }
};

onMounted(() => load(1));
</script>

<template>
  <section class="companies-page">
    <PageHeader
      :title="$t('platform.companies.title')"
      :subtitle="$t('platform.companies.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('platform.companies.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('platform.companies.searchPlaceholder')"
      :aria-label="$t('platform.companies.searchPlaceholder')"
      clearable
      class="companies-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('platform.companies.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty
        v-else-if="!companies.length"
        :description="$t(search.trim() ? 'platform.companies.noResults' : 'platform.companies.empty')"
      >
        <template #image><Building2 :size="40" aria-hidden="true" /></template>
      </el-empty>

      <CompaniesTable
        v-else
        v-loading="isLoading"
        :companies="companies"
        :toggling-uuid="togglingUuid"
        @edit="openEdit"
        @toggle-active="toggleActive"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="companies-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />

    <CompanyDialog v-model="isDialogOpen" :company="editingCompany" @saved="onSaved" />
  </section>
</template>

<style scoped>
.companies-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.companies-page > :deep(.page-header) {
  margin-bottom: 0;
}

.companies-search {
  max-width: 320px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.companies-pagination {
  justify-content: flex-end;
}
</style>
