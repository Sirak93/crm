<script setup lang="ts">
import { CompanyStatus, type ICompany } from 'armstock-shared';
import { Ban, CircleCheck, Ellipsis, Pencil } from 'lucide-vue-next';

defineProps<{
  companies: ICompany[];
  /** uuid of the company whose status is saving. */
  updatingUuid: string | null;
}>();

const emit = defineEmits<{
  edit: [company: ICompany];
  setStatus: [company: ICompany, status: CompanyStatus];
}>();

const STATUS_TAG: Record<CompanyStatus, { labelKey: string; type: 'success' | 'danger' }> = {
  [CompanyStatus.ACTIVE]: { labelKey: 'platform.companies.status.active', type: 'success' },
  [CompanyStatus.BLOCKED]: { labelKey: 'platform.companies.status.blocked', type: 'danger' },
};

const ACTION = { EDIT: 'edit', BLOCK: 'block', ACTIVATE: 'activate' } as const;
type Action = typeof ACTION[keyof typeof ACTION];

const onAction = (company: ICompany, action: Action) => {
  if (action === ACTION.EDIT) emit('edit', company);
  else emit('setStatus', company, action === ACTION.BLOCK ? CompanyStatus.BLOCKED : CompanyStatus.ACTIVE);
};
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
    <el-table-column :label="$t('platform.companies.table.status')" min-width="110">
      <template #default="{ row }">
        <el-tag size="small" :type="STATUS_TAG[row.status as CompanyStatus].type" round>
          {{ $t(STATUS_TAG[row.status as CompanyStatus].labelKey) }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column min-width="70" align="center">
      <template #default="{ row }">
        <el-dropdown
          trigger="click"
          placement="bottom-end"
          :disabled="updatingUuid === row.uuid"
          @command="(action: Action) => onAction(row as ICompany, action)"
        >
          <button
            type="button"
            class="icon-btn"
            :disabled="updatingUuid === row.uuid"
            :aria-label="$t('platform.companies.actionsFor', { name: row.name })"
          >
            <Ellipsis :size="18" aria-hidden="true" />
          </button>

          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="ACTION.EDIT" class="action-item">
                <Pencil :size="16" aria-hidden="true" />
                <span>{{ $t('platform.companies.actions.edit') }}</span>
              </el-dropdown-item>
              <el-dropdown-item
                v-if="row.status === CompanyStatus.ACTIVE"
                :command="ACTION.BLOCK"
                class="action-item action-item--danger"
              >
                <Ban :size="16" aria-hidden="true" />
                <span>{{ $t('platform.companies.actions.block') }}</span>
              </el-dropdown-item>
              <el-dropdown-item v-else :command="ACTION.ACTIVATE" class="action-item">
                <CircleCheck :size="16" aria-hidden="true" />
                <span>{{ $t('platform.companies.actions.activate') }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.icon-btn:hover:not(:disabled) {
  background-color: var(--bg-muted);
  color: var(--text-main);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.action-item {
  gap: 0.5rem;
}

.action-item--danger {
  color: var(--danger);
}
</style>
