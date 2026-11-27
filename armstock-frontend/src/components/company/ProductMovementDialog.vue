<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  Permission,
  RECIPE_QUANTITY_DECIMALS,
  StockDocumentType,
  type IStockMovement,
  type IStockMovementDocument,
  type StockInReason,
  type StockOutReason,
} from 'armstock-shared';
import { ArrowLeftRight, ChevronRight } from 'lucide-vue-next';
import RecipeIcon from './RecipeIcon.vue';
import AppDialog from '../AppDialog.vue';
import ExportButton from '../ExportButton.vue';
import LoadError from '../LoadError.vue';
import { StockService } from '../../services/StockService';
import { useAuthStore } from '../../stores/auth';
import { useMeasureUnits } from '../../composables/useMeasureUnits';
import { useStockReasons } from '../../composables/useStockReasons';
import { useExcelExport } from '../../composables/useExcelExport';
import { ROUTE_NAME } from '../../constants/constants';
import type { IStockMovementFilters } from '../../interfaces/IStockMovementFilters';
import { formatDate, formatDateTimeShort, formatNumber, formatQuantity } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The table row clicked; its documents load each time the popup opens. */
  product: IStockMovement | null;
  range: Pick<IStockMovementFilters, 'dateFrom' | 'dateTo'>;
}>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();
const { unitShortName } = useMeasureUnits();
const { stockInReasonName, stockOutReasonName } = useStockReasons();
const { isExporting, runExport } = useExcelExport();

const DOCUMENT_TYPES = {
  [StockDocumentType.STOCK_IN]: {
    route: ROUTE_NAME.COMPANY_STOCK_IN,
    permission: Permission.STOCK_IN_VIEW,
    reason: (reason: number) => stockInReasonName(reason as StockInReason),
  },
  [StockDocumentType.STOCK_OUT]: {
    route: ROUTE_NAME.COMPANY_STOCK_OUT,
    permission: Permission.STOCK_OUT_VIEW,
    reason: (reason: number) => stockOutReasonName(reason as StockOutReason),
  },
};

const header = ref<IStockMovement | null>(null);
const documents = ref<IStockMovementDocument[]>([]);
const page = ref(0);
const totalPages = ref(0);
const openRows = ref<Record<string, boolean>>({});
const isLoading = ref(false);
const hasError = ref(false);

const hasMore = computed(() => page.value < totalPages.value);
const unit = computed(() => (props.product ? unitShortName(props.product.measureUnit) : ''));

const title = computed(() => (props.product ? `${props.product.name} (${unit.value})` : ''));

const rangeText = computed(() => {
  const { dateFrom, dateTo } = props.range;
  if (dateFrom && dateTo) return t('stockMovement.popup.range', { from: formatDate(dateFrom), to: formatDate(dateTo) });
  if (dateFrom) return t('stockMovement.popup.rangeFrom', { from: formatDate(dateFrom) });
  if (dateTo) return t('stockMovement.popup.rangeTo', { to: formatDate(dateTo) });
  return t('stockMovement.popup.allTime');
});

const totals = computed(() => (header.value
  ? [
    { key: 'initial', label: 'stockMovement.table.initial', value: header.value.initial },
    { key: 'incoming', label: 'stockMovement.table.in', value: header.value.incoming },
    { key: 'outgoing', label: 'stockMovement.table.out', value: header.value.outgoing },
    { key: 'final', label: 'stockMovement.table.final', value: header.value.final },
  ]
  : []));

const loadPage = async () => {
  if (!props.product || isLoading.value) return;
  isLoading.value = true;
  hasError.value = false;
  try {
    const { data, meta } = await StockService.productMovement(props.product.uuid, page.value + 1, props.range);
    header.value = data.product;
    documents.value.push(...data.documents);
    page.value = meta.page;
    totalPages.value = meta.totalPages;
  } catch (error) {
    AppLogger.error('Failed to load the product movement:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
  // Observing again reports where the end is once the new rows are drawn, so a still-visible end loads the next page.
  await nextTick();
  if (sentinel.value) {
    observer.unobserve(sentinel.value);
    observer.observe(sentinel.value);
  }
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  header.value = null;
  documents.value = [];
  page.value = 0;
  totalPages.value = 0;
  openRows.value = {};
  loadPage();
});

// The next page loads when the end of the list scrolls into view.
const sentinel = ref<HTMLElement | null>(null);
const observer = new IntersectionObserver(([entry]) => {
  if (entry?.isIntersecting && hasMore.value && !hasError.value) loadPage();
});
watch(sentinel, (element) => {
  observer.disconnect();
  if (element) observer.observe(element);
});
onBeforeUnmount(() => observer.disconnect());

const canOpenDocument = (doc: IStockMovementDocument): boolean =>
  !!authStore.user?.can(DOCUMENT_TYPES[doc.type].permission);

const documentHref = (doc: IStockMovementDocument): string =>
  router.resolve({ name: DOCUMENT_TYPES[doc.type].route, params: { uuid: doc.uuid } }).href;

const expandedRows = computed(() => Object.keys(openRows.value).filter((uuid) => openRows.value[uuid]));

const toggleRow = (doc: IStockMovementDocument) => {
  openRows.value = { ...openRows.value, [doc.uuid]: !openRows.value[doc.uuid] };
};

const exportFile = () => {
  if (props.product) runExport(() => StockService.exportProductMovement(props.product!.uuid, props.range));
};

const quantity = (value: number): string => (value ? formatQuantity(value) : '');
</script>

<template>
  <AppDialog v-model="open" :title="title" :subtitle="rangeText" width="920px">
    <template #icon><ArrowLeftRight :size="20" /></template>

    <LoadError v-if="hasError && !header" :message="$t('stockMovement.popup.loadError')" @retry="loadPage" />

    <el-skeleton v-else-if="!header" :rows="6" animated />

    <div v-else class="product-movement">
      <dl class="product-movement__totals">
        <div
          v-for="total in totals"
          :key="total.key"
          :class="['product-movement__total', { 'product-movement__total--final': total.key === 'final' }]"
        >
          <dt>{{ $t(total.label) }}</dt>
          <dd>{{ formatQuantity(total.value) }} <span class="product-movement__unit">{{ unit }}</span></dd>
        </div>
      </dl>

      <el-empty v-if="!documents.length" :description="$t('stockMovement.popup.empty')" :image-size="64" />

      <el-table
        v-else
        :data="documents"
        class="app-table app-table--nowrap product-movement__table"
        row-key="uuid"
        :expand-row-keys="expandedRows"
      >
        <!-- Only for the recipe rows under a document - opened by the reason toggle, so its own arrow is hidden. -->
        <el-table-column type="expand" width="1" class-name="product-movement__expand">
          <template #default="{ row }">
            <ul class="product-movement__recipes">
              <li v-for="(recipe, index) in row.recipes" :key="index">
                <span class="product-movement__recipe-name">
                  {{ $t('stockMovement.popup.recipe', { name: recipe.name, persons: formatNumber(recipe.persons) }) }}
                </span>
                <span class="product-movement__recipe-amount">
                  {{ formatQuantity(recipe.quantity, RECIPE_QUANTITY_DECIMALS) }}
                  <span class="product-movement__unit">{{ unit }}</span>
                </span>
              </li>
            </ul>
          </template>
        </el-table-column>
        <el-table-column :label="$t('stockMovement.popup.date')" min-width="130">
          <template #default="{ row }"><span class="cell-text">{{ formatDateTimeShort(row.date) }}</span></template>
        </el-table-column>
        <el-table-column :label="$t('stockMovement.popup.document')" min-width="140">
          <template #default="{ row }">
            <a
              v-if="canOpenDocument(row as IStockMovementDocument)"
              :href="documentHref(row as IStockMovementDocument)"
              target="_blank"
              rel="noopener"
              class="cell-text cell-text--strong product-movement__link"
            >
              {{ row.number }}
            </a>
            <span v-else class="cell-text">{{ row.number }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('stockMovement.popup.reason')" min-width="220">
          <template #default="{ row }">
            <button
              v-if="row.recipes.length"
              type="button"
              class="product-movement__toggle"
              :aria-expanded="!!openRows[row.uuid]"
              @click="toggleRow(row as IStockMovementDocument)"
            >
              <ChevronRight
                :size="16"
                aria-hidden="true"
                :class="['product-movement__chevron', { 'product-movement__chevron--open': openRows[row.uuid] }]"
              />
              <span>{{ DOCUMENT_TYPES[(row as IStockMovementDocument).type].reason(row.reason) }}</span>
              <RecipeIcon />
            </button>
            <span v-else class="cell-text">{{ DOCUMENT_TYPES[(row as IStockMovementDocument).type].reason(row.reason) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('stockMovement.table.in')" min-width="100" align="right">
          <template #default="{ row }"><span class="cell-text">{{ quantity(row.incoming) }}</span></template>
        </el-table-column>
        <el-table-column :label="$t('stockMovement.table.out')" min-width="100" align="right">
          <template #default="{ row }">
            <span class="cell-text">{{ row.recipes.length ? formatQuantity(row.outgoing) : quantity(row.outgoing) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('stockMovement.popup.stockAfter')" min-width="120" align="right">
          <template #default="{ row }"><span class="cell-text cell-text--strong">{{ formatQuantity(row.stockAfter) }}</span></template>
        </el-table-column>

        <template #append>
          <div ref="sentinel" class="product-movement__more">
            <el-button v-if="hasError" link type="primary" @click="loadPage">{{ $t('stockMovement.popup.loadMoreError') }}</el-button>
            <span v-else-if="isLoading" class="product-movement__loading">{{ $t('stockMovement.popup.loadingMore') }}</span>
          </div>
        </template>
      </el-table>
    </div>

    <template #footer>
      <ExportButton :loading="isExporting" :disabled="!header" @click="exportFile" />
      <el-button @click="open = false">{{ $t('common.close') }}</el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
/* No scroll anchoring: it kept the end of the list in view as rows were added, so every page loaded at once. */
.product-movement {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-anchor: none;
}

.product-movement__totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.5rem;
  margin: 0;
}

.product-movement__total {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg-app);
}

.product-movement__total dt {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.product-movement__total dd {
  margin: 0.125rem 0 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.product-movement__total--final {
  border-color: var(--primary);
  background-color: var(--primary-light);
}

.product-movement__total--final dd {
  color: var(--primary-dark);
}

.product-movement__unit {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
}

.product-movement__table {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.product-movement__link {
  color: var(--primary-dark);
  text-decoration: none;
}

.product-movement__link:hover {
  text-decoration: underline;
}

.product-movement__link:focus-visible,
.product-movement__toggle:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.product-movement__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: var(--text-main);
  cursor: pointer;
}

.product-movement__chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: var(--transition);
}

.product-movement__chevron--open {
  transform: rotate(90deg);
}

.product-movement__table :deep(.product-movement__expand .cell) {
  display: none;
}

.product-movement__table :deep(.el-table__expanded-cell) {
  padding: 0.5rem 1rem 0.75rem 2.5rem !important;
  background-color: var(--bg-app);
}

.product-movement__table :deep(.el-table__expanded-cell:hover) {
  background-color: var(--bg-app) !important;
}

.product-movement__recipes {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.product-movement__recipes li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background-color: var(--bg-card);
}

.product-movement__recipe-name {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  color: var(--text-main);
}

.product-movement__recipe-amount {
  flex-shrink: 0;
  white-space: nowrap;
  font-weight: 600;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}

.product-movement__more {
  min-height: 1px;
  padding: 0.25rem;
  text-align: center;
}

.product-movement__loading {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .product-movement__chevron {
    transition: none;
  }
}
</style>
