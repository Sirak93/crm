<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Permission, type IStockOutDetails } from 'armstock-shared';
import { Pencil, Trash2 } from 'lucide-vue-next';
import BackLink from '../../components/BackLink.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import StockOutLinesTable from '../../components/company/StockOutLinesTable.vue';
import StockOutPanel from '../../components/company/StockOutPanel.vue';
import { StockOutService } from '../../services/StockOutService';
import { useStockOutDelete } from '../../composables/useStockOutDelete';
import { useAuthStore } from '../../stores/auth';
import { ROUTE_NAME } from '../../constants/constants';
import { STOCK_OUT_DEPARTMENT_LABEL, STOCK_OUT_REASON_LABEL } from '../../constants/stockOutReasons';
import { formatDateTimeShort, formatNumber } from '../../utils/format';
import { docPanelGroups } from '../../utils/stockOutPanel';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  uuid: string;
}>();

const router = useRouter();
const { t } = useI18n();
const authStore = useAuthStore();
const { deleteStockOut } = useStockOutDelete();

const doc = ref<IStockOutDetails | null>(null);
const isLoading = ref(true);
const hasError = ref(false);
const isDeleting = ref(false);
// Hovering a product in the panel or the table marks it in the other too.
const hoveredProduct = ref<string | null>(null);

/** Edit and delete: the creator only, each with its own permission. */
const isCreator = computed(() => !!doc.value && doc.value.createdBy.uuid === authStore.user?.uuid);
const canEdit = computed(() => isCreator.value && !!authStore.user?.can(Permission.STOCK_OUT_EDIT));
const canDelete = computed(() => isCreator.value && !!authStore.user?.can(Permission.STOCK_OUT_DELETE));

const hasRecipes = computed(() => !!doc.value?.recipes.length);
const panelGroups = computed(() => (doc.value ? docPanelGroups(doc.value, t('stockOut.lines.title')) : []));

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    doc.value = await StockOutService.get(props.uuid);
  } catch (error) {
    AppLogger.error('Failed to load the stock-out document:', error);
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
    if (await deleteStockOut(doc.value)) await router.replace({ name: ROUTE_NAME.COMPANY_STOCK_OUTS });
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <section class="stock-out-view">
    <BackLink :to="{ name: ROUTE_NAME.COMPANY_STOCK_OUTS }" :label="$t('stockOut.backToList')" />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockOut.loadOneError')" @retry="load" />

    <el-skeleton v-else-if="isLoading || !doc" :rows="8" animated />

    <template v-else>
      <PageHeader :title="doc.number" :subtitle="$t(STOCK_OUT_REASON_LABEL[doc.reason])">
        <template v-if="canEdit || canDelete" #actions>
          <el-button v-if="canEdit" @click="router.push({ name: ROUTE_NAME.COMPANY_STOCK_OUT_EDIT, params: { uuid: doc.uuid } })">
            <Pencil :size="16" aria-hidden="true" />
            <span>{{ $t('stockOut.actions.edit') }}</span>
          </el-button>
          <el-button v-if="canDelete" type="danger" plain :loading="isDeleting" @click="onDelete">
            <Trash2 :size="16" aria-hidden="true" />
            <span>{{ $t('stockOut.actions.delete') }}</span>
          </el-button>
        </template>
      </PageHeader>

      <div class="out-layout" :class="{ 'out-layout--panel': hasRecipes }">
        <div class="out-layout__main">
          <AppCard>
            <dl class="doc-info">
              <div class="doc-info__item">
                <dt>{{ $t('stockOut.form.date') }}</dt>
                <dd>{{ formatDateTimeShort(doc.date) }}</dd>
              </div>
              <div v-if="doc.supplier" class="doc-info__item">
                <dt>{{ $t('stockOut.form.supplier') }}</dt>
                <dd>{{ doc.supplier.name }}</dd>
              </div>
              <div v-if="doc.department" class="doc-info__item">
                <dt>{{ $t('stockOut.form.department') }}</dt>
                <dd>{{ $t(STOCK_OUT_DEPARTMENT_LABEL[doc.department]) }}</dd>
              </div>
              <div v-if="doc.receiver" class="doc-info__item">
                <dt>{{ $t('stockOut.form.receiver') }}</dt>
                <dd>{{ doc.receiver.name }}</dd>
              </div>
              <div class="doc-info__item">
                <dt>{{ $t('stockOut.table.createdBy') }}</dt>
                <dd>{{ doc.createdBy.name }}</dd>
              </div>
              <div v-if="doc.note" class="doc-info__item doc-info__item--wide">
                <dt>{{ $t('stockOut.form.note') }}</dt>
                <dd class="doc-info__note">{{ doc.note }}</dd>
              </div>
            </dl>
          </AppCard>

          <AppCard class="lines-card">
            <h2 v-if="hasRecipes" class="lines-card__title">{{ $t('stockOut.totals.title') }}</h2>
            <StockOutLinesTable
              :lines="doc.lines"
              :with-recipes="hasRecipes"
              :highlighted="hoveredProduct"
              @hover="hoveredProduct = $event"
            />
            <div v-if="!hasRecipes" class="lines-card__footer">
              <span>{{ $t('stockOut.form.rowCount', { count: formatNumber(doc.lines.length) }) }}</span>
            </div>
          </AppCard>
        </div>

        <StockOutPanel
          v-if="hasRecipes"
          class="out-layout__side"
          :groups="panelGroups"
          :recipe-count="doc.recipes.length"
          :product-count="doc.lines.length"
          :highlighted="hoveredProduct"
          @hover="hoveredProduct = $event"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.stock-out-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-out-view > :deep(.page-header) {
  margin-bottom: 0;
}

/* A doc with recipes: the summary stays on the right while the rows scroll. */
.out-layout,
.out-layout__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

@media (min-width: 1200px) {
  .out-layout--panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(18rem, 24vw, 24rem);
    align-items: start;
  }

  .out-layout--panel .out-layout__side {
    position: sticky;
    top: calc(var(--header-height) + 1rem);
    max-height: calc(100dvh - var(--header-height) - 2rem);
  }
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

.lines-card__title {
  margin: 0;
  padding: 0.875rem clamp(0.75rem, 2vw, 1.25rem) 0.5rem;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.lines-card__footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
