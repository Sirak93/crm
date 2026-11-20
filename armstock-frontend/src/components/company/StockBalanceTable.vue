<script setup lang="ts">
import { ProductStatus, type IStockBalance } from 'armstock-shared';
import { Info } from 'lucide-vue-next';
import CodeBadge from '../CodeBadge.vue';
import { formatApproxMoney, formatQuantity } from '../../utils/format';

defineProps<{
  balances: IStockBalance[];
}>();
</script>

<template>
  <el-table :data="balances" class="app-table app-table--nowrap" row-key="uuid">
    <el-table-column :label="$t('stockBalance.table.product')" min-width="240" show-overflow-tooltip>
      <template #default="{ row }">
        <span class="cell-text cell-text--strong">{{ row.name }}</span>
        <el-tag v-if="row.status === ProductStatus.ARCHIVED" size="small" type="info" round class="balance-table__tag">
          {{ $t('status.archived') }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.code')" min-width="120">
      <template #default="{ row }">
        <CodeBadge v-if="row.code" :code="row.code" />
        <span v-else class="cell-text cell-text--muted">—</span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.category')" min-width="160" show-overflow-tooltip>
      <template #default="{ row }"><span class="cell-text">{{ row.categoryName }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.quantity')" min-width="110" align="right">
      <template #default="{ row }"><span class="cell-text">{{ formatQuantity(row.quantity) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.unit')" min-width="70">
      <template #default="{ row }"><span class="cell-text cell-text--muted">{{ row.unitShortName }}</span></template>
    </el-table-column>
    <el-table-column min-width="130" align="right">
      <template #header>
        <el-tooltip :content="$t('stockBalance.table.avgPriceHint')" placement="top">
          <span class="balance-table__hint" tabindex="0" :aria-label="`${$t('stockBalance.table.avgPrice')}: ${$t('stockBalance.table.avgPriceHint')}`">
            {{ $t('stockBalance.table.avgPrice') }}
            <Info :size="14" aria-hidden="true" />
          </span>
        </el-tooltip>
      </template>
      <template #default="{ row }">
        <span :class="['cell-text', { 'cell-text--muted': row.avgPrice === null }]">
          {{ row.avgPrice === null ? '—' : formatApproxMoney(row.avgPrice) }}
        </span>
      </template>
    </el-table-column>
    <el-table-column :label="$t('stockBalance.table.value')" min-width="140" align="right">
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ formatApproxMoney(row.value) }}</span></template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.balance-table__tag {
  margin-left: 0.5rem;
}

.balance-table__hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: help;
}
</style>
