<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormItemRule, FormRules } from 'element-plus';
import { MONEY_DECIMALS, StockInReason, type IStockInDetails, type IStockInPayload } from 'armstock-shared';
import BackLink from '../../components/BackLink.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import SupplierSelect from '../../components/company/SupplierSelect.vue';
import StockInLinesEditor from '../../components/company/StockInLinesEditor.vue';
import { StockInService } from '../../services/StockInService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useUnsavedChanges } from '../../composables/useUnsavedChanges';
import { useAuthStore } from '../../stores/auth';
import { DATE_TIME_PICKER_FORMAT, REQUIRED_RULE_TRIGGER, ROUTE_NAME } from '../../constants/constants';
import { STOCK_IN_REASON_LABEL, STOCK_IN_REASONS } from '../../constants/stockInReasons';
import type { IStockInLineForm } from '../../interfaces/IStockInLineForm';
import type { ISupplierOption } from '../../interfaces/ISupplierOption';
import { formatMoney, formatNumber, roundTo } from '../../utils/format';
import { emptyLine, isLineValid, toLineForm } from '../../utils/stockInLines';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** Missing = a new document. */
  uuid?: string;
}>();

const router = useRouter();
const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();

const isEdit = computed(() => !!props.uuid);

const formRef = ref<FormInstance>();
const form = ref({
  reason: StockInReason.PURCHASE as StockInReason,
  date: new Date(),
  supplierUuid: '',
  invoiceNumber: '',
  note: '',
});
const lines = ref<IStockInLineForm[]>([emptyLine()]);
const original = ref<IStockInDetails | null>(null);
const selectedSupplier = ref<ISupplierOption | null>(null);

const isLoading = ref(isEdit.value);
const hasError = ref(false);
const isSaving = ref(false);
const showLineErrors = ref(false);

const isPurchase = computed(() => form.value.reason === StockInReason.PURCHASE);

const documentTotal = computed(() =>
  roundTo(lines.value.reduce((sum, line) => sum + (line.total ?? 0), 0), MONEY_DECIMALS),
);

/** What is compared to tell whether anything changed. Row keys and product details are left out. */
const snapshotOf = () => JSON.stringify({
  ...form.value,
  date: form.value.date?.getTime(),
  lines: lines.value.map(({ productUuid, quantity, price, total }) => ({ productUuid, quantity, price, total })),
});
const savedSnapshot = ref(snapshotOf());
const isDirty = computed(() => snapshotOf() !== savedSnapshot.value);

useUnsavedChanges(isDirty);

const isFuture = (date: Date) => date.getTime() > Date.now();

const requiredWhen = (condition: () => boolean, messageKey: string): FormItemRule => ({
  validator: (_rule, value: string, callback) => {
    callback(condition() && !value?.trim() ? new Error(t(messageKey)) : undefined);
  },
  trigger: REQUIRED_RULE_TRIGGER,
});

const rules: FormRules = {
  reason: [{ required: true, message: () => t('stockIn.form.reasonRequired'), trigger: REQUIRED_RULE_TRIGGER }],
  date: [
    { required: true, message: () => t('stockIn.form.dateRequired'), trigger: REQUIRED_RULE_TRIGGER },
    {
      validator: (_rule, value: Date | null, callback) => callback(value && isFuture(value) ? new Error(t('stockIn.form.dateFuture')) : undefined),
      trigger: REQUIRED_RULE_TRIGGER,
    },
  ],
  supplierUuid: [requiredWhen(() => isPurchase.value, 'stockIn.form.supplierRequired')],
  note: [requiredWhen(() => form.value.reason === StockInReason.OTHER, 'stockIn.form.noteRequired')],
};

/** Whole future days are greyed out; a later time today is caught by the rule above. */
const disabledDate = (date: Date) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date > endOfToday;
};

const listRoute = { name: ROUTE_NAME.COMPANY_STOCK_INS };
const backRoute = computed(() => (props.uuid ? { name: ROUTE_NAME.COMPANY_STOCK_IN, params: { uuid: props.uuid } } : listRoute));

const load = async () => {
  if (!props.uuid) return;
  isLoading.value = true;
  hasError.value = false;
  try {
    const doc = await StockInService.get(props.uuid);
    // Only the creator edits; the API refuses anyone else too.
    if (doc.createdByUuid !== authStore.user?.uuid) {
      await router.replace(backRoute.value);
      return;
    }
    original.value = doc;
    form.value = {
      reason: doc.reason,
      date: new Date(doc.date),
      supplierUuid: doc.supplierUuid ?? '',
      invoiceNumber: doc.invoiceNumber ?? '',
      note: doc.note ?? '',
    };
    selectedSupplier.value = doc.supplierUuid ? { uuid: doc.supplierUuid, name: doc.supplierName ?? '' } : null;
    lines.value = doc.lines.map(toLineForm);
    savedSnapshot.value = snapshotOf();
  } catch (error) {
    AppLogger.error('Failed to load the stock-in document:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

const toPayload = (): IStockInPayload => ({
  reason: form.value.reason,
  date: form.value.date.toISOString(),
  supplierUuid: isPurchase.value ? form.value.supplierUuid || null : null,
  invoiceNumber: isPurchase.value ? form.value.invoiceNumber.trim() || null : null,
  note: form.value.note.trim() || null,
  lines: lines.value.map((line) => ({
    productUuid: line.productUuid,
    quantity: line.quantity!,
    price: line.price!,
    total: line.total!,
  })),
});

const save = async () => {
  const isHeaderValid = await formRef.value?.validate().catch(() => false);
  const areLinesValid = lines.value.length > 0 && lines.value.every(isLineValid);
  showLineErrors.value = !areLinesValid;
  if (!areLinesValid) {
    NotificationService.error(t(lines.value.length ? 'stockIn.form.linesInvalid' : 'stockIn.form.linesRequired'));
  }
  if (!isHeaderValid || !areLinesValid) return;

  isSaving.value = true;
  try {
    const saved = props.uuid
      ? await StockInService.update(props.uuid, toPayload())
      : await StockInService.create(toPayload());
    savedSnapshot.value = snapshotOf();
    NotificationService.success(t(isEdit.value ? 'stockIn.updated' : 'stockIn.created', { number: saved.number }));
    await router.replace({ name: ROUTE_NAME.COMPANY_STOCK_IN, params: { uuid: saved.uuid } });
  } catch (error) {
    NotificationService.error(parseError(error, 'stockIn.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="stock-in-form-page">
    <BackLink :to="backRoute" :label="$t(isEdit ? 'stockIn.backToDocument' : 'stockIn.backToList')" />

    <PageHeader
      :title="isEdit ? $t('stockIn.editTitle', { number: original?.number ?? '' }) : $t('stockIn.addTitle')"
      :subtitle="$t('stockIn.formSubtitle')"
    />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockIn.loadOneError')" @retry="load" />

    <el-skeleton v-else-if="isLoading" :rows="8" animated />

    <template v-else>
      <AppCard>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
          <div class="form-row">
            <el-form-item :label="$t('stockIn.form.reason')" prop="reason">
              <el-select v-model="form.reason" :aria-label="$t('stockIn.form.reason')">
                <el-option v-for="reason in STOCK_IN_REASONS" :key="reason" :label="$t(STOCK_IN_REASON_LABEL[reason])" :value="reason" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('stockIn.form.date')" prop="date">
              <el-date-picker
                v-model="form.date"
                type="datetime"
                :format="DATE_TIME_PICKER_FORMAT"
                :disabled-date="disabledDate"
                :clearable="false"
                class="stock-in-form__date"
              />
            </el-form-item>
          </div>

          <div v-if="isPurchase" class="form-row">
            <el-form-item :label="$t('stockIn.form.supplier')" prop="supplierUuid">
              <SupplierSelect
                v-model="form.supplierUuid"
                :selected="selectedSupplier"
                active-only
                :placeholder="$t('stockIn.form.supplierPlaceholder')"
              />
            </el-form-item>
            <el-form-item :label="$t('stockIn.form.invoiceNumber')" prop="invoiceNumber">
              <el-input v-model="form.invoiceNumber" maxlength="100" :placeholder="$t('stockIn.form.optional')" />
            </el-form-item>
          </div>

          <el-form-item :label="$t('stockIn.form.note')" prop="note">
            <el-input
              v-model="form.note"
              type="textarea"
              :rows="2"
              maxlength="1000"
              :placeholder="form.reason === StockInReason.OTHER ? $t('stockIn.form.notePlaceholderOther') : $t('stockIn.form.optional')"
            />
          </el-form-item>

          <!-- Lets Enter submit the form. -->
          <button type="submit" hidden />
        </el-form>
      </AppCard>

      <AppCard class="lines-card">
        <StockInLinesEditor v-model="lines" :show-errors="showLineErrors" />
      </AppCard>

      <div class="form-bar" role="region" :aria-label="$t('stockIn.form.summary')">
        <div class="form-bar__summary">
          <span>{{ $t('stockIn.form.rowCount', { count: formatNumber(lines.length) }) }}</span>
          <span class="form-bar__total">{{ $t('stockIn.form.total') }}: <strong>{{ formatMoney(documentTotal) }}</strong></span>
        </div>
        <div class="form-bar__actions">
          <el-button :disabled="isSaving" @click="router.push(backRoute)">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.stock-in-form-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-in-form-page > :deep(.page-header) {
  margin-bottom: 0;
}

.stock-in-form__date {
  width: 100%;
}

.lines-card {
  padding: 0;
  overflow: hidden;
}

/* Stays at the bottom of the screen while the rows scroll. */
.form-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.75rem clamp(0.75rem, 2vw, 1.25rem);
  background-color: var(--bg-card);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}

.form-bar__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1.25rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.form-bar__total {
  font-size: var(--text-base);
  color: var(--text-main);
}

.form-bar__actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 576px) {
  .form-bar__actions {
    width: 100%;
  }

  .form-bar__actions .el-button {
    flex: 1;
  }
}
</style>
