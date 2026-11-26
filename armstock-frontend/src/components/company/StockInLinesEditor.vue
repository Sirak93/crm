<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  MEASURE_UNITS,
  Permission,
  QUANTITY_MAX,
  type IProduct,
  type IProductCategory,
  type IStockLineProduct,
} from 'armstock-shared';
import { Plus, Trash2 } from 'lucide-vue-next';
import ProductSelect from './ProductSelect.vue';
import CodeBadge from '../CodeBadge.vue';
import ProductDialog from './ProductDialog.vue';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { NotificationService } from '../../services/NotificationService';
import { useAuthStore } from '../../stores/auth';
import { AppLogger } from '../../utils/AppLogger';
import type { IStockInLineForm } from '../../interfaces/IStockInLineForm';
import { emptyLine } from '../../utils/stockInLines';
import { quantityPrecision, toLineProduct, withScannedProduct } from '../../utils/stockLines';
import { OptionsService } from '../../services/OptionsService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useBarcodeScanner } from '../../composables/useBarcodeScanner';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

defineProps<{
  /** Highlight rows that are not filled in correctly - set after a failed save. */
  showErrors: boolean;
}>();

const lines = defineModel<IStockInLineForm[]>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const { unitShortName } = useMeasureUnits();
const authStore = useAuthStore();

const productRefs = new Map<number, { focus: () => void }>();

const canCreateProduct = computed(() => !!authStore.user?.can(Permission.PRODUCT_ADD));
const isProductDialogOpen = ref(false);
const newProductName = ref('');
/** null = the product comes from a scan and goes onto the lines like any scanned product. */
const newProductRowKey = ref<number | null>(null);
const newProductBarcode = ref('');
const isScanning = ref(false);
const categories = ref<IProductCategory[]>([]);

// Like 1C: the new row goes at the bottom and the cursor jumps to its product.
const addLine = async () => {
  const line = emptyLine();
  lines.value = [...lines.value, line];
  await nextTick();
  productRefs.get(line.key)?.focus();
};

const removeLine = (key: number) => {
  lines.value = lines.value.filter((line) => line.key !== key);
  productRefs.delete(key);
};

const onProductSelect = (line: IStockInLineForm, product: IStockLineProduct) => {
  line.product = product;
  // A whole-number unit drops any decimals typed for the previous product.
  if (!MEASURE_UNITS[product.measureUnit].allowsDecimals && line.quantity !== undefined) {
    line.quantity = Math.round(line.quantity);
  }
};

// Categories are needed only for the dialog, so they load the first time it opens.
const openProductDialog = async (line: IStockInLineForm | null, name: string, barcode = '') => {
  if (!categories.value.length) {
    try {
      categories.value = await ProductCategoryService.list();
    } catch (error) {
      AppLogger.error('Failed to load categories:', error);
      NotificationService.error(t('stockIn.lines.productDataError'));
      return;
    }
  }
  newProductRowKey.value = line?.key ?? null;
  newProductName.value = name;
  newProductBarcode.value = barcode;
  isProductDialogOpen.value = true;
};

/** The new product goes straight onto the row it was created from. */
const onProductCreated = (product: IProduct) => {
  if (newProductRowKey.value === null) {
    addScannedProduct(toLineProduct(product));
    return;
  }
  const line = lines.value.find((l) => l.key === newProductRowKey.value);
  if (!line) return;
  line.productUuid = product.uuid;
  onProductSelect(line, toLineProduct(product));
};

const addScannedProduct = (product: IStockLineProduct) => {
  lines.value = withScannedProduct(lines.value, product, emptyLine).lines;
};

const onScan = async (barcode: string) => {
  isScanning.value = true;
  try {
    const [product] = await OptionsService.products({ barcode });
    if (product) addScannedProduct(product);
    else if (!canCreateProduct.value) NotificationService.error(t('scanner.notFound', { barcode }));
    else if (await NotificationService.offer(t('scanner.notFoundTitle'), t('scanner.notFound', { barcode }), t('scanner.createProduct'))) {
      await openProductDialog(null, '', barcode);
    }
  } catch (error) {
    NotificationService.error(parseError(error, 'scanner.lookupError'));
  } finally {
    isScanning.value = false;
  }
};

useBarcodeScanner(onScan, () => !isProductDialogOpen.value && !isScanning.value);

const setProductRef = (key: number, el: unknown) => {
  if (el) productRefs.set(key, el as { focus: () => void });
};
</script>

<template>
  <div class="lines-editor">
    <el-table :data="lines" class="app-table lines-editor__table" row-key="key">
      <el-table-column type="index" label="#" width="48" align="center" />
      <el-table-column :label="$t('stockIn.lines.product')" min-width="240">
        <template #default="{ row }">
          <ProductSelect
            :ref="(el) => setProductRef(row.key, el)"
            v-model="row.productUuid"
            :selected="row.product"
            :placeholder="$t('stockIn.lines.productPlaceholder')"
            :can-create="canCreateProduct"
            :class="{ 'is-invalid': showErrors && !row.productUuid }"
            class="lines-editor__product"
            @select="(product: IStockLineProduct) => onProductSelect(row as IStockInLineForm, product)"
            @create="(name: string) => openProductDialog(row as IStockInLineForm, name)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockIn.lines.code')" min-width="100">
        <template #default="{ row }">
          <CodeBadge v-if="row.product?.code" :code="row.product.code" />
          <span v-else class="cell-text cell-text--muted">—</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockIn.lines.quantity')" min-width="130">
        <template #default="{ row }">
          <el-input-number
            v-model="row.quantity"
            :controls="false"
            :disabled="!row.productUuid"
            :min="0"
            :max="QUANTITY_MAX"
            :precision="quantityPrecision(row.product)"
            :aria-label="$t('stockIn.lines.quantity')"
            :class="{ 'is-invalid': showErrors && !(row.quantity > 0) }"
            class="lines-editor__number"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockIn.lines.unit')" min-width="70">
        <template #default="{ row }">
          <span :class="['cell-text', { 'cell-text--muted': !row.product }]">{{ row.product ? unitShortName(row.product.measureUnit) : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column width="56" align="center">
        <template #default="{ row, $index }">
          <button
            type="button"
            class="lines-editor__remove"
            :aria-label="$t('stockIn.lines.remove', { row: $index + 1 })"
            @click="removeLine((row as IStockInLineForm).key)"
          >
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </template>
      </el-table-column>
    </el-table>

    <div class="lines-editor__footer">
      <el-button @click="addLine">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ $t('stockIn.lines.add') }}</span>
      </el-button>
    </div>

    <ProductDialog
      v-model="isProductDialogOpen"
      :product="null"
      :categories="categories"
      :initial-name="newProductName"
      :initial-barcode="newProductBarcode"
      @saved="onProductCreated"
    />
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
