<script setup lang="ts">
import type { IUnusedIndex } from 'armstock-shared';
import { formatBytes } from '../../utils/format';

defineProps<{
  indexes: IUnusedIndex[];
}>();
</script>

<template>
  <el-table :data="indexes" class="app-table">
    <el-table-column prop="index" :label="$t('platform.database.unusedIndexes.index')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }">
        <div class="strong">{{ row.index }}</div>
        <div class="muted">{{ row.schema }}.{{ row.table }}</div>
      </template>
    </el-table-column>
    <el-table-column prop="sizeBytes" :label="$t('platform.database.unusedIndexes.size')" min-width="120" align="right">
      <template #default="{ row }"><span class="strong">{{ formatBytes(row.sizeBytes) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.strong {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-main);
}

.muted {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
