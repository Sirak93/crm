<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IStockLineProduct } from 'armstock-shared';
import { Package, Plus, Search, Trash2 } from 'lucide-vue-next';
import SectionHeader from '../SectionHeader.vue';
import ProductSelect from './ProductSelect.vue';
import type { IStockOutLineForm } from '../../interfaces/IStockOutLineForm';
import { emptyOutLine } from '../../utils/stockOutLines';
import { withScannedProduct } from '../../utils/stockLines';
import { OptionsService } from '../../services/OptionsService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useBarcodeScanner } from '../../composables/useBarcodeScanner';

/** Products given out without a recipe - picked here, their amounts typed in the totals. */
const props = defineProps<{
  /** Products already in the totals - not offered again. */
  excludeUuids: string[];
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
    // No amount here - a product scanned again stays on its row.
    const result = withScannedProduct(lines.value, product, emptyOutLine, { get: () => 0, set: () => {} });
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
    <SectionHeader :title="$t('stockOut.lines.title')" :hint="$t('stockOut.lines.hint')" inset>
      <template #icon><Package :size="18" /></template>
    </SectionHeader>

    <p v-if="!lines.length" class="form-empty">
      <Package :size="16" aria-hidden="true" />
      {{ $t('stockOut.lines.empty') }}
    </p>

    <!-- No column titles: the section title and the field's own text say what goes where. -->
    <el-table v-else :data="lines" :show-header="false" class="app-table app-table--form lines-editor__table" row-key="key">
      <el-table-column :label="$t('stockOut.lines.product')" min-width="260">
        <template #default="{ row }">
          <ProductSelect
            :ref="(el) => setProductRef(row.key, el)"
            v-model="row.productUuid"
            :selected="row.product"
            :placeholder="$t('stockOut.lines.productPlaceholder')"
            for-stock-out
            :supplied-by="suppliedBy"
            :exclude-uuids="excludeUuids"
            class="lines-editor__product"
            @select="(product: IStockLineProduct) => onProductSelect(row as IStockOutLineForm, product)"
          >
            <template #prefix><Search :size="15" aria-hidden="true" /></template>
          </ProductSelect>
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
.lines-editor__product {
  width: 100%;
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
