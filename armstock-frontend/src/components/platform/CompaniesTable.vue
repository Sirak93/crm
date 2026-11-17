<script setup lang="ts">
import type { ICompany } from 'armstock-shared';
import { Pencil } from 'lucide-vue-next';

defineProps<{
  companies: ICompany[];
  /** uuid of the company whose switch is saving. */
  togglingUuid: string | null;
}>();

defineEmits<{
  edit: [company: ICompany];
  toggleActive: [company: ICompany, isActive: boolean];
}>();
</script>

<template>
  <el-table :data="companies" class="app-table companies-table">
    <el-table-column prop="name" :label="$t('platform.companies.table.name')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span class="main main--strong">{{ row.name }}</span></template>
    </el-table-column>
    <el-table-column prop="taxId" :label="$t('platform.companies.table.taxId')" min-width="130" show-overflow-tooltip>
      <template #default="{ row }"><span :class="row.taxId ? 'main' : 'muted'">{{ row.taxId || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="phone" :label="$t('platform.companies.table.phone')" min-width="140" show-overflow-tooltip>
      <template #default="{ row }"><span :class="row.phone ? 'main' : 'muted'">{{ row.phone || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="email" :label="$t('platform.companies.table.email')" min-width="200" show-overflow-tooltip>
      <template #default="{ row }"><span :class="row.email ? 'main' : 'muted'">{{ row.email || '—' }}</span></template>
    </el-table-column>
    <el-table-column prop="address" :label="$t('platform.companies.table.address')" min-width="220" show-overflow-tooltip>
      <template #default="{ row }"><span :class="row.address ? 'main' : 'muted'">{{ row.address || '—' }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('platform.companies.table.active')" min-width="100" align="center">
      <template #default="{ row }">
        <el-switch
          :model-value="row.isActive"
          :loading="togglingUuid === row.uuid"
          :aria-label="$t('platform.companies.table.activeFor', { name: row.name })"
          @change="(value: string | number | boolean) => $emit('toggleActive', row, Boolean(value))"
        />
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <button
          type="button"
          class="icon-btn"
          :aria-label="$t('platform.companies.editFor', { name: row.name })"
          @click="$emit('edit', row)"
        >
          <Pencil :size="16" aria-hidden="true" />
        </button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.companies-table :deep(.el-table__body .cell),
.companies-table :deep(.el-table__header .cell) {
  white-space: nowrap;
}

.companies-table :deep(.el-table__body .cell) {
  overflow: hidden;
  text-overflow: ellipsis;
}

.main {
  font-size: var(--text-sm);
  color: var(--text-main);
}

.main--strong {
  font-weight: 600;
}

.muted {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  transition: var(--transition);
}

.icon-btn:hover {
  background-color: var(--primary-light);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
