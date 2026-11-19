<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { IStockInDetails } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import BackLink from '../../components/BackLink.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockInLinesTable from '../../components/company/StockInLinesTable.vue';
import { StockInService } from '../../services/StockInService';
import { useStockInDelete } from '../../composables/useStockInDelete';
import { useAuthStore } from '../../stores/auth';
import { ROUTE_NAME } from '../../constants/constants';
import { STOCK_IN_REASON_LABEL } from '../../constants/stockInReasons';
import { formatDateTimeShort, formatMoney, formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  uuid: string;
}>();

const router = useRouter();
const authStore = useAuthStore();
const { deleteStockIn } = useStockInDelete();

const doc = ref<IStockInDetails | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const isDeleting = ref(false);

const isCreator = computed(() => !!doc.value && doc.value.createdByUuid === authStore.user?.uuid);

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
      <PageHeader :title="doc.number" :subtitle="$t(STOCK_IN_REASON_LABEL[doc.reason])">
        <template v-if="isCreator" #actions>
          <el-button @click="router.push({ name: ROUTE_NAME.COMPANY_STOCK_IN_EDIT, params: { uuid: doc.uuid } })">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('stockIn.actions.edit') }}</span>
          </el-button>
          <el-button type="danger" plain :loading="isDeleting" @click="onDelete">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('stockIn.actions.delete') }}</span>
          </el-button>
        </template>
      </PageHeader>

      <AppCard>
        <dl class="doc-info">
          <div class="doc-info__item">
            <dt>{{ $t('stockIn.form.date') }}</dt>
            <dd>{{ formatDateTimeShort(doc.date) }}</dd>
          </div>
          <div v-if="doc.supplierName" class="doc-info__item">
            <dt>{{ $t('stockIn.form.supplier') }}</dt>
            <dd>{{ doc.supplierName }}</dd>
          </div>
          <div v-if="doc.invoiceNumber" class="doc-info__item">
            <dt>{{ $t('stockIn.form.invoiceNumber') }}</dt>
            <dd>{{ doc.invoiceNumber }}</dd>
          </div>
          <div class="doc-info__item">
            <dt>{{ $t('stockIn.table.createdBy') }}</dt>
            <dd>{{ doc.createdByName }}</dd>
          </div>
          <div v-if="doc.note" class="doc-info__item doc-info__item--wide">
            <dt>{{ $t('stockIn.form.note') }}</dt>
            <dd class="doc-info__note">{{ doc.note }}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard class="lines-card">
        <StockInLinesTable :lines="doc.lines" />
        <div class="lines-card__footer">
          <span>{{ $t('stockIn.form.rowCount', { count: formatNumber(doc.lines.length) }) }}</span>
          <span class="lines-card__total">{{ $t('stockIn.form.total') }}: <strong>{{ formatMoney(doc.total) }}</strong></span>
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

.doc-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem 1.5rem;
  margin: 0;
}

.doc-info__item--wide {
  grid-column: 1 / -1;
}

.doc-info dt {
  margin-bottom: 0.25rem;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.doc-info dd {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-main);
}

.doc-info__note {
  white-space: pre-wrap;
}

.lines-card {
  padding: 0;
  overflow: hidden;
}

.lines-card__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.lines-card__total {
  font-size: var(--text-base);
  color: var(--text-main);
}
</style>
