<script setup lang="ts">
import type { IApiLog } from 'armstock-shared';
import { Info } from 'lucide-vue-next';
import { formatDateTime, formatNumber } from '../../utils/format';

defineProps<{
  logs: IApiLog[];
}>();

interface IPayload {
  query?: Record<string, unknown>;
  body?: unknown;
  error?: unknown;
}

const payloadOf = (row: IApiLog) => (row.payload ?? {}) as IPayload;
const hasQuery = (row: IApiLog) => Object.keys(payloadOf(row as IApiLog).query ?? {}).length > 0;
const toJson = (value: unknown) => JSON.stringify(value, null, 2);
</script>

<template>
  <el-table :data="logs" class="app-table logs-table">
    <el-table-column prop="createdAt" :label="$t('platform.logs.table.time')" min-width="170">
      <template #default="{ row }"><span class="muted">{{ formatDateTime(row.createdAt) }}</span></template>
    </el-table-column>
    <el-table-column prop="method" :label="$t('platform.logs.table.method')" min-width="90">
      <template #default="{ row }"><el-tag size="small" effect="plain" round>{{ row.method }}</el-tag></template>
    </el-table-column>
    <el-table-column prop="path" :label="$t('platform.logs.table.path')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }"><span class="main">{{ row.path }}</span></template>
    </el-table-column>
    <el-table-column prop="statusCode" :label="$t('platform.logs.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="row.success ? 'success' : 'danger'" round>{{ row.statusCode }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="durationMs" :label="$t('platform.logs.table.duration')" min-width="120">
      <template #default="{ row }">
        <span class="duration" :class="{ 'duration--slow': row.slow }">{{ formatNumber(row.durationMs) }} ms</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('platform.logs.table.user')" min-width="180" show-overflow-tooltip>
      <template #default="{ row }">
        <span v-if="row.user" class="main">{{ row.user.email }}</span>
        <span v-else class="muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('platform.logs.table.company')" min-width="160" show-overflow-tooltip>
      <template #default="{ row }">
        <span v-if="row.company" class="main">{{ row.company.name }}</span>
        <span v-else class="muted">—</span>
      </template>
    </el-table-column>
    <el-table-column prop="ip" :label="$t('platform.logs.table.ip')" min-width="140" show-overflow-tooltip>
      <template #default="{ row }">
        <span v-if="row.ip" class="main">{{ row.ip }}</span>
        <span v-else class="muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('platform.logs.table.details')" min-width="100" align="center">
      <template #default="{ row }">
        <el-popover v-if="row.payload" placement="left" trigger="click" width="360">
          <template #reference>
            <button type="button" class="details-trigger" :aria-label="$t('platform.logs.table.details')">
              <Info :size="16" aria-hidden="true" />
            </button>
          </template>

          <div class="details">
            <div v-if="payloadOf(row as IApiLog).error">
              <div class="details__label details__label--danger">{{ $t('platform.logs.details.error') }}</div>
              <pre class="details__pre details__pre--danger">{{ toJson(payloadOf(row as IApiLog).error) }}</pre>
            </div>
            <div v-if="hasQuery(row as IApiLog)">
              <div class="details__label">{{ $t('platform.logs.details.query') }}</div>
              <pre class="details__pre">{{ toJson(payloadOf(row as IApiLog).query) }}</pre>
            </div>
            <div v-if="payloadOf(row as IApiLog).body">
              <div class="details__label">{{ $t('platform.logs.details.payload') }}</div>
              <pre class="details__pre">{{ toJson(payloadOf(row as IApiLog).body) }}</pre>
            </div>
          </div>
        </el-popover>
        <span v-else class="muted">—</span>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
/* Body cells truncate; the card scrolls sideways instead of squeezing columns. */
.logs-table :deep(.el-table__body .cell),
.logs-table :deep(.el-table__header .cell) {
  white-space: nowrap;
}

.logs-table :deep(.el-table__body .cell) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.main {
  font-size: var(--text-sm);
  color: var(--text-main);
}

.muted {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.duration {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-muted);
}

.duration--slow {
  color: var(--danger);
}

.details-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
}

.details-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.details__label {
  margin-bottom: 4px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-muted);
}

.details__label--danger {
  color: var(--danger);
}

.details__pre {
  max-height: 200px;
  margin: 0;
  padding: 6px 8px;
  overflow-y: auto;
  border-radius: 8px;
  background-color: var(--bg-app);
  font-size: var(--text-xs);
  white-space: pre-wrap;
  word-break: break-word;
}

.details__pre--danger {
  background-color: var(--danger-light);
  color: var(--danger);
}
</style>
