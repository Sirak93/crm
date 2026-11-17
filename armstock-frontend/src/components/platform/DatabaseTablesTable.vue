<script setup lang="ts">
import type { ITableStorage } from 'armstock-shared';
import { Table2 } from 'lucide-vue-next';
import { formatBytes, formatDateTime, formatNumber } from '../../utils/format';

defineProps<{
  tables: ITableStorage[];
}>();

/** Data / index / TOAST widths as a share of the row's own total, so every bar fills its track. */
const composition = (table: ITableStorage) => {
  const total = table.totalSizeBytes || 1;
  return {
    data: (table.tableSizeBytes / total) * 100,
    index: (table.indexSizeBytes / total) * 100,
    toast: (table.toastSizeBytes / total) * 100,
  };
};

/** Dead rows are normal; a large share means VACUUM is falling behind. */
const deadRowTagType = (percent: number) => {
  if (percent >= 20) return 'danger';
  if (percent >= 10) return 'warning';
  return 'info';
};

/** Indexes weighing more than the data they index are worth a second look. */
const indexRatioTagType = (ratio: number) => (ratio > 1 ? 'warning' : 'info');
</script>

<template>
  <el-table :data="tables" class="app-table" :default-sort="{ prop: 'totalSizeBytes', order: 'descending' }">
    <el-table-column type="expand">
      <template #default="{ row }">
        <div class="details">
          <div>
            <div class="details__label">{{ $t('platform.database.table.avgRowSize') }}</div>
            <div class="details__value">{{ formatBytes(row.avgRowSizeBytes) }}</div>
            <div class="details__hint">{{ $t('platform.database.hints.avgRowSize') }}</div>
          </div>
          <div>
            <div class="details__label">{{ $t('platform.database.table.indexRatio') }}</div>
            <div class="details__value">
              {{ row.indexToTableRatio }}×
              <el-tag :type="indexRatioTagType(row.indexToTableRatio)" size="small" round>
                {{ $t('platform.database.table.indexCount', { count: formatNumber(row.indexCount) }) }}
              </el-tag>
            </div>
            <div class="details__hint">{{ $t('platform.database.hints.indexRatio') }}</div>
          </div>
          <div>
            <div class="details__label">{{ $t('platform.database.table.deadRows') }}</div>
            <div class="details__value">
              {{ formatNumber(row.deadRowCount) }}
              <el-tag :type="deadRowTagType(row.deadRowPercent)" size="small" round>{{ row.deadRowPercent }}%</el-tag>
            </div>
            <div class="details__hint">{{ $t('platform.database.hints.deadRows') }}</div>
          </div>
          <div>
            <div class="details__label">{{ $t('platform.database.table.scans') }}</div>
            <div class="details__value">
              {{ $t('platform.database.table.scanSplit', { seq: formatNumber(row.seqScans), idx: formatNumber(row.indexScans) }) }}
            </div>
            <div class="details__hint">{{ $t('platform.database.hints.scans') }}</div>
          </div>
          <div>
            <div class="details__label">{{ $t('platform.database.table.lastVacuum') }}</div>
            <div class="details__value">{{ formatDateTime(row.lastVacuumAt) }}</div>
          </div>
          <div>
            <div class="details__label">{{ $t('platform.database.table.lastAnalyze') }}</div>
            <div class="details__value">{{ formatDateTime(row.lastAnalyzeAt) }}</div>
            <div class="details__hint">{{ $t('platform.database.hints.lastAnalyze') }}</div>
          </div>
          <div>
            <div class="details__label">{{ $t('platform.database.table.schema') }}</div>
            <div class="details__value">{{ row.schema }}</div>
          </div>
        </div>
      </template>
    </el-table-column>

    <el-table-column prop="table" :label="$t('platform.database.table.name')" min-width="220" sortable show-overflow-tooltip>
      <template #default="{ row }">
        <div class="name-cell">
          <span class="name-cell__icon"><Table2 :size="14" aria-hidden="true" /></span>
          <div class="name-cell__text">
            <div class="strong">{{ row.table }}</div>
            <div class="muted small">{{ row.schema }}</div>
          </div>
        </div>
      </template>
    </el-table-column>

    <el-table-column prop="rowCount" :label="$t('platform.database.table.rows')" min-width="130" sortable align="right">
      <template #default="{ row }"><span class="strong">{{ formatNumber(row.rowCount) }}</span></template>
    </el-table-column>

    <el-table-column prop="totalSizeBytes" :label="$t('platform.database.table.totalSize')" min-width="220" sortable>
      <template #default="{ row }">
        <div class="total-cell">
          <span class="strong">{{ formatBytes(row.totalSizeBytes) }}</span>
          <span class="muted small">{{ row.percentOfDatabase }}%</span>
        </div>
        <div class="composition-bar" :title="$t('platform.database.table.compositionHint')">
          <div class="segment segment--data" :style="{ width: `${composition(row as ITableStorage).data}%` }"></div>
          <div class="segment segment--index" :style="{ width: `${composition(row as ITableStorage).index}%` }"></div>
          <div class="segment segment--toast" :style="{ width: `${composition(row as ITableStorage).toast}%` }"></div>
        </div>
      </template>
    </el-table-column>

    <el-table-column prop="tableSizeBytes" :label="$t('platform.database.table.dataSize')" min-width="130" sortable align="right">
      <template #default="{ row }"><span class="muted">{{ formatBytes(row.tableSizeBytes) }}</span></template>
    </el-table-column>

    <el-table-column prop="indexSizeBytes" :label="$t('platform.database.table.indexSize')" min-width="150" sortable align="right">
      <template #default="{ row }">
        <span class="muted">{{ formatBytes(row.indexSizeBytes) }}</span>
        <span class="muted small block">{{ $t('platform.database.table.indexCount', { count: formatNumber(row.indexCount) }) }}</span>
      </template>
    </el-table-column>

    <el-table-column prop="toastSizeBytes" :label="$t('platform.database.table.toastSize')" min-width="130" sortable align="right">
      <template #default="{ row }">
        <span class="muted">{{ row.toastSizeBytes > 0 ? formatBytes(row.toastSizeBytes) : '—' }}</span>
      </template>
    </el-table-column>

    <el-table-column prop="deadRowPercent" :label="$t('platform.database.table.bloat')" min-width="120" sortable align="right">
      <template #default="{ row }">
        <el-tag :type="deadRowTagType(row.deadRowPercent)" size="small" round>{{ row.deadRowPercent }}%</el-tag>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.app-table :deep(.el-table__expanded-cell) {
  padding: 0;
  background-color: var(--bg-app);
}

.details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  padding: clamp(0.5rem, 2vw, 1rem);
}

.details__label {
  margin-bottom: 4px;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.details__value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-main);
}

.details__hint {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name-cell__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--primary);
  background-color: var(--primary-light);
}

.name-cell__text {
  min-width: 0;
}

.total-cell {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.composition-bar {
  display: flex;
  width: 100%;
  height: 6px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 999px;
  background-color: var(--bg-muted);
}

.segment {
  height: 100%;
}

.segment--data { background-color: var(--primary); }
.segment--index { background-color: var(--warning); }
.segment--toast { background-color: var(--chart-toast); }

.strong {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-main);
}

.muted {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.small {
  font-size: var(--text-xs);
}

.block {
  display: block;
}
</style>
