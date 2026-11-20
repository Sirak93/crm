<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { QUANTITY_DECIMALS, QUANTITY_MAX, type IStockLineProduct } from 'armstock-shared';
import { Plus, Trash2 } from 'lucide-vue-next';
import ProductSelect from './ProductSelect.vue';
import CodeBadge from '../CodeBadge.vue';
import type { IStockOutLineForm } from '../../interfaces/IStockOutLineForm';
import { emptyOutLine } from '../../utils/stockOutLines';
import { withScannedProduct } from '../../utils/stockLines';
import { OptionsService } from '../../services/OptionsService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useBarcodeScanner } from '../../composables/useBarcodeScanner';

const props = defineProps<{
  /** Highlight rows that are not filled in correctly - set after a failed save. */
  showErrors: boolean;
  /** Return: the supplier whose products can be picked (null = none picked yet). */
  suppliedBy?: string | null;
}>();

const lines = defineModel<IStockOutLineForm[]>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const productRefs = new Map<number, { focus: () => void }>();
const isScanning = ref(false);

// Like 1C: the new row goes at the bottom and the cursor jumps to its product.
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

const onProductSelect = (line: IStockOutLineForm, product: IStockLineProduct) => {
  line.product = product;
  // A whole-number unit drops any decimals typed for the previous product.
  if (!product.allowsDecimals && line.quantity !== undefined) line.quantity = Math.round(line.quantity);
};

// Same rules as the product picker: stock-out products only, and for a return only this supplier's.
const onScan = async (barcode: string) => {
  if (props.suppliedBy === null) {
    NotificationService.error(t('stockOut.lines.chooseSupplierFirst'));
    return;
  }
  isScanning.value = true;
  try {
    const [product] = await OptionsService.products({ barcode, forStockOut: true, suppliedBy: props.suppliedBy });
    if (!product) {
      NotificationService.error(t('scanner.notFound', { barcode }));
      return;
    }
    const result = withScannedProduct(lines.value, product, emptyOutLine);
    lines.value = result.lines;
  } catch (error) {
    NotificationService.error(parseError(error, 'scanner.lookupError'));
  } finally {
    isScanning.value = false;
  }
};

useBarcodeScanner(onScan, () => !isScanning.value);

const setProductRef = (key: number, el: unknown) => {
  if (el) productRefs.set(key, el as { focus: () => void });
};
</script>

<template>
  <div class="lines-editor">
    <el-table :data="lines" class="app-table lines-editor__table" row-key="key">
      <el-table-column type="index" label="#" width="48" align="center" />
      <el-table-column :label="$t('stockOut.lines.product')" min-width="260">
        <template #default="{ row }">
          <ProductSelect
            :ref="(el) => setProductRef(row.key, el)"
            v-model="row.productUuid"
            :selected="row.product"
            :placeholder="$t('stockOut.lines.productPlaceholder')"
            for-stock-out
            :supplied-by="suppliedBy"
            :class="{ 'is-invalid': showErrors && !row.productUuid }"
            class="lines-editor__product"
            @select="(product: IStockLineProduct) => onProductSelect(row as IStockOutLineForm, product)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.lines.code')" min-width="100">
        <template #default="{ row }">
          <CodeBadge v-if="row.product?.code" :code="row.product.code" />
          <span v-else class="cell-text cell-text--muted">—</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.lines.quantity')" min-width="140">
        <template #default="{ row }">
          <el-input-number
            v-model="row.quantity"
            :controls="false"
            :disabled="!row.productUuid"
            :min="0"
            :max="QUANTITY_MAX"
            :precision="row.product?.allowsDecimals === false ? 0 : QUANTITY_DECIMALS"
            :aria-label="$t('stockOut.lines.quantity')"
            :class="{ 'is-invalid': showErrors && !(row.quantity > 0) }"
            class="lines-editor__number"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.lines.unit')" min-width="70">
        <template #default="{ row }">
          <span :class="['cell-text', { 'cell-text--muted': !row.product }]">{{ row.product?.unitShortName ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column width="56" align="center">
        <template #default="{ row, $index }">
          <button
            type="button"
            class="lines-editor__remove"
            :aria-label="$t('stockOut.lines.remove', { row: $index + 1 })"
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
        <span>{{ $t('stockOut.lines.add') }}</span>
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
