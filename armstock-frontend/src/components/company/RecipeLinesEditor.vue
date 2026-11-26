<script setup lang="ts">
import { nextTick } from 'vue';
import { QUANTITY_DECIMALS, QUANTITY_MAX, type IStockLineProduct } from 'armstock-shared';
import { Plus, Trash2 } from 'lucide-vue-next';
import ProductSelect from './ProductSelect.vue';
import CodeBadge from '../CodeBadge.vue';
import type { IStockOutLineForm } from '../../interfaces/IStockOutLineForm';
import { emptyOutLine } from '../../utils/stockOutLines';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{
  /** Highlight rows that are not filled in correctly - set after a failed save. */
  showErrors: boolean;
}>();

// Same row shape as a stock-out: product + quantity.
const lines = defineModel<IStockOutLineForm[]>({ required: true });

const { unitShortName } = useMeasureUnits();

const productRefs = new Map<number, { focus: () => void }>();

const addLine = async () => {
  const line = emptyOutLine();
  lines.value = [...lines.value, line];
  await nextTick();
  productRefs.get(line.key)?.focus();
};

const removeLine = (key: number) => {
  lines.value = lines.value.filter((line) => line.key !== key);
  productRefs.delete(key);
};

// Each product once per recipe - those on other rows are not offered again.
const usedElsewhere = (line: IStockOutLineForm) =>
  lines.value.filter((other) => other.key !== line.key && other.productUuid).map((other) => other.productUuid);

const onProductSelect = (line: IStockOutLineForm, product: IStockLineProduct) => {
  line.product = product;
};

const setProductRef = (key: number, el: unknown) => {
  if (el) productRefs.set(key, el as { focus: () => void });
};
</script>

<template>
  <div class="lines-editor">
    <el-table :data="lines" class="app-table lines-editor__table" row-key="key">
      <el-table-column type="index" label="#" width="48" align="center" />
      <el-table-column :label="$t('recipes.lines.product')" min-width="260">
        <template #default="{ row }">
          <ProductSelect
            :ref="(el) => setProductRef(row.key, el)"
            v-model="row.productUuid"
            :selected="row.product"
            :placeholder="$t('recipes.lines.productPlaceholder')"
            :exclude-uuids="usedElsewhere(row as IStockOutLineForm)"
            :class="{ 'is-invalid': showErrors && !row.productUuid }"
            class="lines-editor__product"
            @select="(product: IStockLineProduct) => onProductSelect(row as IStockOutLineForm, product)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('recipes.lines.code')" min-width="100">
        <template #default="{ row }">
          <CodeBadge v-if="row.product?.code" :code="row.product.code" />
          <span v-else class="cell-text cell-text--muted">—</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('recipes.lines.perPerson')" min-width="140">
        <template #default="{ row }">
          <!-- 3 decimals for every unit - only the stock-out total is rounded. -->
          <el-input-number
            v-model="row.quantity"
            :controls="false"
            :disabled="!row.productUuid"
            :min="0"
            :max="QUANTITY_MAX"
            :precision="QUANTITY_DECIMALS"
            :aria-label="$t('recipes.lines.perPerson')"
            :class="{ 'is-invalid': showErrors && !(row.quantity > 0) }"
            class="lines-editor__number"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('recipes.lines.unit')" min-width="70">
        <template #default="{ row }">
          <span :class="['cell-text', { 'cell-text--muted': !row.product }]">{{ row.product ? unitShortName(row.product.measureUnit) : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column width="56" align="center">
        <template #default="{ row, $index }">
          <button
            type="button"
            class="lines-editor__remove"
            :aria-label="$t('recipes.lines.remove', { row: $index + 1 })"
            @click="removeLine((row as IStockOutLineForm).key)"
          >
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </template>
      </el-table-column>
    </el-table>

    <div class="lines-editor__footer">
      <el-button @click="addLine">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ $t('recipes.lines.add') }}</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.lines-editor__product,
.lines-editor__number {
  width: 100%;
}

.lines-editor__number :deep(.el-input__inner) {
  text-align: right;
}

.lines-editor :deep(.is-invalid .el-input__wrapper),
.lines-editor :deep(.is-invalid .el-select__wrapper) {
  border-color: var(--danger) !important;
}

.lines-editor__remove {
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

.lines-editor__remove:hover {
  background-color: var(--danger-light);
  color: var(--danger);
}

.lines-editor__remove:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.lines-editor__footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}
</style>
