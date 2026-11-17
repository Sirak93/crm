<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IDatabaseStorage } from 'armstock-shared';
import { AlertTriangle, Database, HardDrive, KeyRound, RefreshCw, Rows3, Search, Table2 } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import StatCard, { type StatCardColor } from '../../components/StatCard.vue';
import LoadError from '../../components/LoadError.vue';
import DatabaseTablesTable from '../../components/platform/DatabaseTablesTable.vue';
import UnusedIndexesTable from '../../components/platform/UnusedIndexesTable.vue';
import { PlatformDatabaseService } from '../../services/platform/PlatformDatabaseService';
import { formatBytes, formatDateTime, formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();

const storage = ref<IDatabaseStorage | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const search = ref('');

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    storage.value = await PlatformDatabaseService.getStorage();
  } catch (error) {
    AppLogger.error('Failed to load database storage:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

// Filtered in the browser: the whole list is one small set of catalog rows.
const filteredTables = computed(() => {
  const tables = storage.value?.tables ?? [];
  const query = search.value.trim().toLowerCase();
  if (!query) return tables;
  return tables.filter((t) => t.table.toLowerCase().includes(query) || t.schema.toLowerCase().includes(query));
});

/** Catalogs, system tables, and free space are in the database but in no user table. */
const otherSizeBytes = computed(() => {
  const s = storage.value;
  return s ? Math.max(s.databaseSizeBytes - s.totalTableSizeBytes, 0) : 0;
});

const stats = computed(() => {
  const s = storage.value;
  if (!s) return [];
  const indexPercent = s.totalTableSizeBytes > 0 ? Math.round((s.totalIndexSizeBytes / s.totalTableSizeBytes) * 100) : 0;

  return [
    { label: t('platform.database.stats.databaseSize'), value: formatBytes(s.databaseSizeBytes), hint: s.databaseName, icon: HardDrive, color: 'primary' as StatCardColor },
    { label: t('platform.database.stats.tables'), value: formatNumber(s.tableCount), hint: t('platform.database.stats.otherHint', { size: formatBytes(otherSizeBytes.value) }), icon: Table2, color: 'info' as StatCardColor },
    { label: t('platform.database.stats.rows'), value: formatNumber(s.totalRowCount), hint: t('platform.database.stats.rowsHint'), icon: Rows3, color: 'success' as StatCardColor },
    { label: t('platform.database.stats.data'), value: formatBytes(s.totalHeapSizeBytes), hint: t('platform.database.stats.toastHint', { size: formatBytes(s.totalToastSizeBytes) }), icon: Database, color: 'warning' as StatCardColor },
    { label: t('platform.database.stats.indexes'), value: formatBytes(s.totalIndexSizeBytes), hint: t('platform.database.stats.indexesHint', { percent: indexPercent }), icon: KeyRound, color: 'danger' as StatCardColor },
  ];
});

const unusedIndexBytes = computed(() =>
  (storage.value?.unusedIndexes ?? []).reduce((total, index) => total + index.sizeBytes, 0),
);
</script>

<template>
  <section class="database-page">
    <PageHeader
      :title="$t('platform.database.title')"
      :subtitle="$t('platform.database.subtitle')"
      :badge="storage?.databaseName"
    >
      <template #actions>
        <el-button :loading="isLoading" @click="load">
          <RefreshCw v-if="!isLoading" :size="16" aria-hidden="true" />
          <span>{{ $t('common.refresh') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <LoadError v-if="hasError && !isLoading" :message="$t('platform.database.loadError')" @retry="load" />

    <el-skeleton v-else-if="isLoading && !storage" :rows="10" animated />

    <template v-else-if="storage">
      <div class="stats-grid">
        <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
      </div>

      <div class="toolbar">
        <el-input v-model="search" class="toolbar__search" :placeholder="$t('platform.database.searchPlaceholder')" clearable>
          <template #prefix><Search :size="16" aria-hidden="true" /></template>
        </el-input>
        <div class="legend">
          <span class="legend__item"><i class="legend__dot legend__dot--data"></i>{{ $t('platform.database.legend.data') }}</span>
          <span class="legend__item"><i class="legend__dot legend__dot--index"></i>{{ $t('platform.database.legend.indexes') }}</span>
          <span class="legend__item"><i class="legend__dot legend__dot--toast"></i>{{ $t('platform.database.legend.toast') }}</span>
        </div>
      </div>

      <AppCard class="table-card">
        <el-empty v-if="!filteredTables.length" :description="$t('platform.database.noTables')">
          <template #image><Database :size="40" aria-hidden="true" /></template>
          <p class="muted">{{ $t('platform.database.noTablesDesc') }}</p>
        </el-empty>
        <DatabaseTablesTable v-else v-loading="isLoading" :tables="filteredTables" />
      </AppCard>

      <AppCard v-if="storage.unusedIndexes.length">
        <div class="unused-header">
          <h2 class="unused-header__title">
            <AlertTriangle :size="18" class="warning-icon" aria-hidden="true" />
            {{ $t('platform.database.unusedIndexes.title') }}
          </h2>
          <el-tag type="warning" round>
            {{ $t('platform.database.unusedIndexes.reclaimable', { size: formatBytes(unusedIndexBytes) }) }}
          </el-tag>
        </div>
        <p class="muted unused-desc">{{ $t('platform.database.unusedIndexes.description') }}</p>
        <UnusedIndexesTable :indexes="storage.unusedIndexes" />
      </AppCard>

      <p class="footnote">
        {{ $t('platform.database.footnote.rowCounts') }}
        {{ $t('platform.database.footnote.generatedAt', { time: formatDateTime(storage.generatedAt) }) }}
        <template v-if="storage.statsResetAt">
          {{ $t('platform.database.footnote.statsReset', { time: formatDateTime(storage.statsResetAt) }) }}
        </template>
      </p>
    </template>
  </section>
</template>

<style scoped>
.database-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.database-page > :deep(.page-header) {
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.toolbar__search {
  flex: 1 1 260px;
  max-width: 450px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.legend__dot {
  width: 10px;
  height: 10px;
  display: inline-block;
  border-radius: 3px;
}

.legend__dot--data { background-color: var(--primary); }
.legend__dot--index { background-color: var(--warning); }
.legend__dot--toast { background-color: var(--chart-toast); }

.table-card {
  padding: 0;
  overflow: hidden;
}

.unused-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.unused-header__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-main);
}

.warning-icon {
  color: var(--warning);
}

.unused-desc {
  margin: 0 0 1rem;
}

.muted {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.footnote {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
