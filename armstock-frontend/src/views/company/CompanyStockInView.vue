<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Permission, type IStockInDetails } from 'armstock-shared';
import { CalendarDays, Pencil, Receipt, Trash2 } from 'lucide-vue-next';
import BackLink from '../../components/BackLink.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import DocFacts from '../../components/DocFacts.vue';
import LoadError from '../../components/LoadError.vue';
import StockInLinesTable from '../../components/company/StockInLinesTable.vue';
import { StockInService } from '../../services/StockInService';
import { useStockInDelete } from '../../composables/useStockInDelete';
import { useAuthStore } from '../../stores/auth';
import { ROUTE_NAME } from '../../constants/constants';
import { STOCK_IN_REASON_ICON } from '../../constants/stockInReasons';
import type { IDocFact } from '../../interfaces/IDocFact';
import { formatDateTimeShort, formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useStockReasons } from '../../composables/useStockReasons';

const { stockInReasonName } = useStockReasons();

const props = defineProps<{
  uuid: string;
}>();

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const { deleteStockIn } = useStockInDelete();

const doc = ref<IStockInDetails | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const isDeleting = ref(false);

/** Edit and delete: the creator only, each with its own permission. */
const isCreator = computed(() => !!doc.value && doc.value.createdBy.uuid === authStore.user?.uuid);
const canEdit = computed(() => isCreator.value && !!authStore.user?.can(Permission.STOCK_IN_EDIT));
const canDelete = computed(() => isCreator.value && !!authStore.user?.can(Permission.STOCK_IN_DELETE));

const facts = computed((): IDocFact[] => {
  const d = doc.value;
  if (!d) return [];
  return [
    { key: 'reason', icon: STOCK_IN_REASON_ICON[d.reason], label: t('stockIn.form.reason'), text: stockInReasonName(d.reason), primary: true },
    { key: 'date', icon: CalendarDays, label: t('stockIn.form.date'), text: formatDateTimeShort(d.date) },
    ...(d.invoiceNumber ? [{ key: 'invoice', icon: Receipt, label: t('stockIn.form.invoiceNumber'), text: d.invoiceNumber }] : []),
  ];
});

// Creator always first; then the supplier it came from, if any.
const parties = computed(() => {
  const d = doc.value;
  if (!d) return [];
  return [
    { key: 'createdBy', label: t('stockIn.table.createdBy'), text: d.createdBy.name },
    ...(d.supplier ? [{ key: 'supplier', label: t('stockIn.form.supplier'), text: d.supplier.name }] : []),
  ];
});

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    doc.value = await StockInService.get(props.uuid);
  } catch (error) {
    AppLogger.error('Failed to load the stock-in document:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);
watch(() => props.uuid, load);

const onDelete = async () => {
  if (!doc.value) return;
  isDeleting.value = true;
  try {
    if (await deleteStockIn(doc.value)) await router.replace({ name: ROUTE_NAME.COMPANY_STOCK_INS });
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <section class="stock-in-view">
    <BackLink :to="{ name: ROUTE_NAME.COMPANY_STOCK_INS }" :label="$t('stockIn.backToList')" />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockIn.loadOneError')" @retry="load" />

    <el-skeleton v-else-if="isLoading || !doc" :rows="8" animated />

    <template v-else>
      <PageHeader :title="doc.number">
        <template v-if="canEdit || canDelete" #actions>
          <el-button v-if="canEdit" @click="router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN_EDIT, params: { uuid: doc.uuid } })">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('stockIn.actions.edit') }}</span>
          </el-button>
          <el-button v-if="canDelete" type="danger" plain :loading="isDeleting" @click="onDelete">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('stockIn.actions.delete') }}</span>
          </el-button>
        </template>
      </PageHeader>

      <AppCard>
        <DocFacts :facts="facts" :parties="parties" :note="doc.note" :note-label="$t('stockIn.form.note')" />
      </AppCard>

      <AppCard class="lines-card">
        <StockInLinesTable :lines="doc.lines" />
        <div class="lines-card__footer">
          <span>{{ $t('stockIn.form.rowCount', { count: formatNumber(doc.lines.length) }) }}</span>
        </div>
      </AppCard>
    </template>
  </section>
</template>

<style scoped>
.stock-in-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-in-view > :deep(.page-header) {
  margin-bottom: 0;
}

.lines-card {
  padding: 0;
  overflow: hidden;
}

.lines-card__footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
