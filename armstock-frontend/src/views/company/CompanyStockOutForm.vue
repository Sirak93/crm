<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormItemRule, FormRules } from 'element-plus';
import {
  StockOutDepartment,
  StockOutReason,
  type INamedRef,
  type IStockOutDetails,
  type IStockOutPayload,
} from 'armstock-shared';
import BackLink from '../../components/BackLink.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import SupplierSelect from '../../components/company/SupplierSelect.vue';
import ReceiverSelect from '../../components/company/ReceiverSelect.vue';
import StockOutLinesEditor from '../../components/company/StockOutLinesEditor.vue';
import { StockOutService } from '../../services/StockOutService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useUnsavedChanges } from '../../composables/useUnsavedChanges';
import { useAuthStore } from '../../stores/auth';
import { DATE_TIME_PICKER_FORMAT, REQUIRED_RULE_TRIGGER, ROUTE_NAME } from '../../constants/constants';
import {
  STOCK_OUT_DEPARTMENT_LABEL,
  STOCK_OUT_DEPARTMENTS,
  STOCK_OUT_REASON_LABEL,
  STOCK_OUT_REASONS,
} from '../../constants/stockOutReasons';
import type { IStockOutLineForm } from '../../interfaces/IStockOutLineForm';
import { formatNumber, isFutureDay } from '../../utils/format';
import { emptyOutLine, isOutLineValid, toOutLineForm } from '../../utils/stockOutLines';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** Missing = a new document. */
  uuid?: string;
}>();

const router = useRouter();
const { t } = useI18n();
const { showError } = useApiErrorMessage();
const authStore = useAuthStore();

const isEdit = computed(() => !!props.uuid);

const formRef = ref<FormInstance>();
// The department stays filled in, so switching to Issued already has Kitchen.
const form = ref({
  reason: StockOutReason.ISSUED as StockOutReason,
  date: new Date(),
  supplierUuid: '',
  department: StockOutDepartment.KITCHEN as StockOutDepartment | '',
  receiverUuid: '',
  note: '',
});
const lines = ref<IStockOutLineForm[]>([emptyOutLine()]);
const original = ref<IStockOutDetails | null>(null);
const selectedSupplier = ref<INamedRef | null>(null);
const selectedReceiver = ref<INamedRef | null>(null);

const isLoading = ref(isEdit.value);
const hasError = ref(false);
const isSaving = ref(false);
const showLineErrors = ref(false);

const isReturned = computed(() => form.value.reason === StockOutReason.RETURNED);
const isIssued = computed(() => form.value.reason === StockOutReason.ISSUED);
const isOther = computed(() => form.value.reason === StockOutReason.OTHER);

/** What is compared to tell whether anything changed. Row keys and product details are left out. */
const snapshotOf = () => JSON.stringify({
  ...form.value,
  date: form.value.date?.getTime(),
  lines: lines.value.map(({ productUuid, quantity }) => ({ productUuid, quantity })),
});
const savedSnapshot = ref(snapshotOf());
const isDirty = computed(() => snapshotOf() !== savedSnapshot.value);

useUnsavedChanges(isDirty);

const isFuture = (date: Date) => date.getTime() > Date.now();

const requiredWhen = (condition: () => boolean, messageKey: string): FormItemRule => ({
  validator: (_rule, value: string | number, callback) => {
    callback(condition() && !String(value ?? '').trim() ? new Error(t(messageKey)) : undefined);
  },
  trigger: REQUIRED_RULE_TRIGGER,
});

const rules: FormRules = {
  reason: [{ required: true, message: () => t('stockOut.form.reasonRequired'), trigger: REQUIRED_RULE_TRIGGER }],
  date: [
    { required: true, message: () => t('stockOut.form.dateRequired'), trigger: REQUIRED_RULE_TRIGGER },
    {
      validator: (_rule, value: Date | null, callback) => callback(value && isFuture(value) ? new Error(t('stockOut.form.dateFuture')) : undefined),
      trigger: REQUIRED_RULE_TRIGGER,
    },
  ],
  supplierUuid: [requiredWhen(() => isReturned.value, 'stockOut.form.supplierRequired')],
  department: [requiredWhen(() => isIssued.value, 'stockOut.form.departmentRequired')],
  note: [requiredWhen(() => isOther.value, 'stockOut.form.noteRequired')],
};

const listRoute = { name: ROUTE_NAME.COMPANY_STOCK_OUTS };
const backRoute = computed(() => (props.uuid ? { name: ROUTE_NAME.COMPANY_STOCK_OUT, params: { uuid: props.uuid } } : listRoute));

const load = async () => {
  if (!props.uuid) return;
  isLoading.value = true;
  hasError.value = false;
  try {
    const doc = await StockOutService.get(props.uuid);
    // Only the creator edits; the API refuses anyone else too.
    if (doc.createdBy.uuid !== authStore.user?.uuid) {
      await router.replace(backRoute.value);
      return;
    }
    original.value = doc;
    form.value = {
      reason: doc.reason,
      date: new Date(doc.date),
      supplierUuid: doc.supplier?.uuid ?? '',
      department: doc.department ?? StockOutDepartment.KITCHEN,
      receiverUuid: doc.receiver?.uuid ?? '',
      note: doc.note ?? '',
    };
    selectedSupplier.value = doc.supplier;
    selectedReceiver.value = doc.receiver;
    lines.value = doc.lines.map(toOutLineForm);
    savedSnapshot.value = snapshotOf();
  } catch (error) {
    AppLogger.error('Failed to load the stock-out document:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

const toPayload = (): IStockOutPayload => ({
  reason: form.value.reason,
  date: form.value.date.toISOString(),
  supplierUuid: isReturned.value ? form.value.supplierUuid || null : null,
  department: isIssued.value ? form.value.department || null : null,
  receiverUuid: isIssued.value ? form.value.receiverUuid || null : null,
  note: form.value.note.trim() || null,
  lines: lines.value.map((line) => ({ productUuid: line.productUuid, quantity: line.quantity! })),
});

const save = async () => {
  const isHeaderValid = await formRef.value?.validate().catch(() => false);
  const areLinesValid = lines.value.length > 0 && lines.value.every(isOutLineValid);
  showLineErrors.value = !areLinesValid;
  if (!areLinesValid) {
    NotificationService.error(t(lines.value.length ? 'stockOut.form.linesInvalid' : 'stockOut.form.linesRequired'));
  }
  if (!isHeaderValid || !areLinesValid) return;

  isSaving.value = true;
  try {
    const saved = props.uuid
      ? await StockOutService.update(props.uuid, toPayload())
      : await StockOutService.create(toPayload());
    savedSnapshot.value = snapshotOf();
    NotificationService.success(t(isEdit.value ? 'stockOut.updated' : 'stockOut.created', { number: saved.number }));
    await router.replace({ name: ROUTE_NAME.COMPANY_STOCK_OUT, params: { uuid: saved.uuid } });
  } catch (error) {
    showError(error, 'stockOut.saveError');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="stock-out-form-page">
    <BackLink :to="backRoute" :label="$t(isEdit ? 'stockOut.backToDocument' : 'stockOut.backToList')" />

    <PageHeader
      :title="isEdit ? $t('stockOut.editTitle', { number: original?.number ?? '' }) : $t('stockOut.addTitle')"
      :subtitle="$t('stockOut.formSubtitle')"
    />

    <LoadError v-if="hasError && !isLoading" :message="$t('stockOut.loadOneError')" @retry="load" />

    <el-skeleton v-else-if="isLoading" :rows="8" animated />

    <template v-else>
      <AppCard>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
          <div class="form-row">
            <el-form-item :label="$t('stockOut.form.reason')" prop="reason">
              <el-select v-model="form.reason" :aria-label="$t('stockOut.form.reason')">
                <el-option v-for="reason in STOCK_OUT_REASONS" :key="reason" :label="$t(STOCK_OUT_REASON_LABEL[reason])" :value="reason" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('stockOut.form.date')" prop="date">
              <el-date-picker
                v-model="form.date"
                type="datetime"
                :format="DATE_TIME_PICKER_FORMAT"
                :disabled-date="isFutureDay"
                :clearable="false"
                class="stock-out-form__date"
              />
            </el-form-item>
          </div>

          <div v-if="isReturned" class="form-row">
            <el-form-item :label="$t('stockOut.form.supplier')" prop="supplierUuid">
              <SupplierSelect
                v-model="form.supplierUuid"
                :selected="selectedSupplier"
                active-only
                :placeholder="$t('stockOut.form.supplierPlaceholder')"
              />
            </el-form-item>
          </div>

          <div v-if="isIssued" class="form-row">
            <el-form-item :label="$t('stockOut.form.department')" prop="department">
              <el-select v-model="form.department" :aria-label="$t('stockOut.form.department')">
                <el-option
                  v-for="department in STOCK_OUT_DEPARTMENTS"
                  :key="department"
                  :label="$t(STOCK_OUT_DEPARTMENT_LABEL[department])"
                  :value="department"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('stockOut.form.receiver')" prop="receiverUuid">
              <ReceiverSelect v-model="form.receiverUuid" :selected="selectedReceiver" :placeholder="$t('stockOut.form.optional')" />
            </el-form-item>
          </div>

          <el-form-item :label="$t('stockOut.form.note')" prop="note">
            <el-input
              v-model="form.note"
              type="textarea"
              :rows="2"
              maxlength="1000"
              :placeholder="isOther ? $t('stockOut.form.notePlaceholderOther') : $t('stockOut.form.optional')"
            />
          </el-form-item>

          <!-- Lets Enter submit the form. -->
          <button type="submit" hidden />
        </el-form>
      </AppCard>

      <AppCard class="lines-card">
        <StockOutLinesEditor v-model="lines" :show-errors="showLineErrors" />
      </AppCard>

      <div class="form-bar" role="region" :aria-label="$t('stockOut.form.summary')">
        <div class="form-bar__summary">
          <span>{{ $t('stockOut.form.rowCount', { count: formatNumber(lines.length) }) }}</span>
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
.stock-out-form-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stock-out-form-page > :deep(.page-header) {
  margin-bottom: 0;
}

.stock-out-form__date {
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
  font-size: var(--text-sm);
  color: var(--text-muted);
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
