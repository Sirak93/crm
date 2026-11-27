<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IApiLog, IPaginationMeta } from 'armstock-shared';
import { ScrollText, Trash2 } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import ApiLogFilters from '../../components/platform/ApiLogFilters.vue';
import ApiLogsTable from '../../components/platform/ApiLogsTable.vue';
import { PlatformLogsService } from '../../services/platform/PlatformLogsService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { IApiLogFilters } from '../../interfaces/IApiLogFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import AppPagination from '../../components/AppPagination.vue';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const logs = ref<IApiLog[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IApiLogFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await PlatformLogsService.list(page, meta.value.pageSize, filters.value);
    logs.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load API logs:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const onFiltersChange = (newFilters: IApiLogFilters) => {
  filters.value = newFilters;
  load(1);
};

const clearAll = async () => {
  const confirmed = await NotificationService.confirm(
    t('platform.logs.clearConfirmTitle'),
    t('platform.logs.clearConfirmText'),
    t('platform.logs.clearData'),
  );
  if (!confirmed) return;

  try {
    await PlatformLogsService.clear();
    NotificationService.success(t('platform.logs.cleared'));
    await load(1);
  } catch (error) {
    NotificationService.error(parseError(error, 'platform.logs.clearError'));
  }
};

onMounted(() => load(1));
</script>

<template>
  <section class="logs-page">
    <PageHeader
      :title="$t('platform.logs.title')"
      :subtitle="$t('platform.logs.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    />

    <ApiLogFilters @change="onFiltersChange">
      <template #end>
        <el-button class="clear-btn" :disabled="!logs.length" @click="clearAll">
          <Trash2 :size="16" aria-hidden="true" />
          <span>{{ $t('platform.logs.clearData') }}</span>
        </el-button>
      </template>
    </ApiLogFilters>

    <LoadError v-if="hasError && !isLoading" :message="$t('platform.logs.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="8" animated class="skeleton" />

      <el-empty v-else-if="!logs.length" :description="$t('platform.logs.noLogs')">
        <template #image><ScrollText :size="40" aria-hidden="true" /></template>
      </el-empty>

      <ApiLogsTable v-else v-loading="isLoading" :logs="logs" />
    </AppCard>

    <AppPagination :meta="meta" @change="load" />
  </section>
</template>

<style scoped>
.logs-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logs-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.clear-btn {
  color: var(--danger) !important;
  border-color: var(--danger-border) !important;
}

.clear-btn:hover:not(.is-disabled) {
  background-color: var(--danger-light) !important;
}
</style>
