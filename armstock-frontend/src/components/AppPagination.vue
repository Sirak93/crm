<script setup lang="ts">
import { computed } from 'vue';
import type { IPaginationMeta } from 'armstock-shared';
import { formatNumber } from '../utils/format';

const props = defineProps<{ meta: IPaginationMeta }>();

defineEmits<{ change: [page: number] }>();

const range = computed(() => ({
  from: formatNumber((props.meta.page - 1) * props.meta.pageSize + 1),
  to: formatNumber(Math.min(props.meta.page * props.meta.pageSize, props.meta.total)),
  total: formatNumber(props.meta.total),
}));
</script>

<template>
  <nav v-if="meta.totalPages > 1" class="app-pagination" :aria-label="$t('common.pagination')">
    <span class="app-pagination__range">{{ $t('common.paginationRange', range) }}</span>
    <el-pagination
      background
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="$emit('change', $event)"
    />
  </nav>
</template>

<style scoped>
.app-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.app-pagination__range {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.app-pagination :deep(.el-pagination) {
  gap: 0.375rem;
}

.app-pagination :deep(.el-pager) {
  gap: 0.375rem;
}

.app-pagination :deep(.btn-prev),
.app-pagination :deep(.btn-next),
.app-pagination :deep(.el-pager li) {
  min-width: 36px;
  height: 36px;
  margin: 0;
  border: 1px solid var(--border-dark);
  border-radius: 10px;
  background-color: var(--bg-card);
  color: var(--text-main);
  font-size: var(--text-sm);
  font-weight: 600;
  transition: var(--transition);
}

.app-pagination :deep(.btn-prev:not(:disabled):hover),
.app-pagination :deep(.btn-next:not(:disabled):hover),
.app-pagination :deep(.el-pager li:not(.is-active):hover) {
  border-color: var(--primary);
  color: var(--primary);
}

.app-pagination :deep(.el-pager li.is-active) {
  border-color: transparent;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: var(--shadow-primary);
  color: var(--text-inverse);
}

.app-pagination :deep(.btn-prev:disabled),
.app-pagination :deep(.btn-next:disabled) {
  background-color: var(--bg-muted);
  color: var(--text-light);
}

@media (max-width: 576px) {
  .app-pagination {
    flex-direction: column;
  }
}
</style>
