<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { FileText } from 'lucide-vue-next';
import type { FormInstance, FormItemRule, FormRules } from 'element-plus';
import {
  KITCHEN_BALANCE_ENABLED,
  RECIPE_QUANTITY_DECIMALS,
  StockOutDepartment,
  StockOutReason,
  type INamedRef,
  type IRecipeOption,
  type IStockOutDetails,
  type IStockOutPayload,
} from 'armstock-shared';
import BackLink from '../../components/BackLink.vue';
import ReasonSelect from '../../components/ReasonSelect.vue';
import SectionHeader from '../../components/SectionHeader.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import SupplierSelect from '../../components/company/SupplierSelect.vue';
import ReceiverSelect from '../../components/company/ReceiverSelect.vue';
import StockOutLinesEditor from '../../components/company/StockOutLinesEditor.vue';
import StockOutRecipesEditor from '../../components/company/StockOutRecipesEditor.vue';
import StockOutTotalsPanel from '../../components/company/StockOutTotalsPanel.vue';
import StockOutPanel from '../../components/company/StockOutPanel.vue';
import { StockOutService } from '../../services/StockOutService';
import { OptionsService } from '../../services/OptionsService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useUnsavedChanges } from '../../composables/useUnsavedChanges';
import { useAuthStore } from '../../stores/auth';
import { DATE_TIME_PICKER_FORMAT, REQUIRED_RULE_TRIGGER, ROUTE_NAME } from '../../constants/constants';
import {
  STOCK_OUT_DEPARTMENTS,
  STOCK_OUT_REASON_ICON,
  STOCK_OUT_REASONS,
} from '../../constants/stockOutReasons';
import type { IStockOutLineForm } from '../../interfaces/IStockOutLineForm';
import type { IStockOutRecipeForm } from '../../interfaces/IStockOutRecipeForm';
import { appNow, fromPickerDate, isFutureDay, toPickerDate } from '../../utils/appTime';
import { emptyOutLine } from '../../utils/stockOutLines';
import { buildTotals, emptyRecipeRow, extraOf, toSavedRecipeOption } from '../../utils/stockOutTotals';
import { formPanelGroups } from '../../utils/stockOutPanel';
import { AppLogger } from '../../utils/AppLogger';
import { useStockReasons } from '../../composables/useStockReasons';

const { stockOutReasonName, departmentName } = useStockReasons();

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
  date: appNow(),
  supplierUuid: '',
  department: StockOutDepartment.KITCHEN as StockOutDepartment | '',
  receiverUuid: '',
  note: '',
});
// The extras block - products given out without a recipe; their amounts are typed in the totals.
const lines = ref<IStockOutLineForm[]>([emptyOutLine()]);
const recipeRows = ref<IStockOutRecipeForm[]>([]);
const recipeOptions = ref<IRecipeOption[]>([]);
// Totals the storekeeper typed, by product uuid; every other product shows its prefill.
const totalOverrides = ref<Record<string, number | undefined>>({});
const original = ref<IStockOutDetails | null>(null);
// The kitchen balance this doc can count on, by product uuid - on edit without the doc's own part.
const kitchen = ref<Map<string, number>>(new Map());
const selectedSupplier = ref<INamedRef | null>(null);
const selectedReceiver = ref<INamedRef | null>(null);

const isLoading = ref(true);
const hasError = ref(false);
const isSaving = ref(false);
const showLineErrors = ref(false);
// Hovering a product in one panel marks it in the other too.
const hoveredProduct = ref<string | null>(null);

const reasonOptions = computed(() => STOCK_OUT_REASONS.map((reason) => ({
  value: reason,
  label: stockOutReasonName(reason),
  icon: STOCK_OUT_REASON_ICON[reason],
})));

const isReturned = computed(() => form.value.reason === StockOutReason.RETURNED);
const isIssued = computed(() => form.value.reason === StockOutReason.ISSUED);
const isOther = computed(() => form.value.reason === StockOutReason.OTHER);

const recipeMap = computed(() => new Map(recipeOptions.value.map((recipe) => [recipe.uuid, recipe])));
const filledLines = computed(() => lines.value.filter((line) => line.productUuid));
// Only an issue goes to the kitchen, so only then is its balance shown.
const showKitchen = computed(() => KITCHEN_BALANCE_ENABLED && isIssued.value);
const totalRows = computed(() => buildTotals(
  recipeRows.value,
  recipeMap.value,
  filledLines.value,
  // Only a new doc prefills need − K: on edit today's K has later docs in it, so it would rewrite an old doc.
  showKitchen.value && !isEdit.value ? kitchen.value : undefined,
));
const totals = computed(() => Object.fromEntries(totalRows.value.map((row) => [
  row.product.uuid,
  row.product.uuid in totalOverrides.value ? totalOverrides.value[row.product.uuid] : row.prefill,
])));
/** The extra of each product - its total above the recipes. */
const extras = computed(() => totalRows.value.flatMap((row) => {
  const total = totals.value[row.product.uuid];
  const quantity = total === undefined ? 0 : extraOf(total, row.needed, row.product);
  return quantity ? [{ key: row.product.uuid, product: row.product, quantity }] : [];
}));
const panelGroups = computed(() => formPanelGroups(recipeRows.value, recipeMap.value, extras.value, t('stockOut.lines.title')));
// Products already in the totals are not offered again in the extras block.
const totalProductUuids = computed(() => totalRows.value.map((row) => row.product.uuid));

// A product whose prefill changes (a recipe or persons changed) drops the typed total and shows the new prefill.
let lastPrefills = new Map<string, number | undefined>();
watch(() => totalRows.value.map((row) => `${row.product.uuid}:${row.prefill}`).join('|'), () => {
  const prefills = new Map(totalRows.value.map((row) => [row.product.uuid, row.prefill]));
  totalOverrides.value = Object.fromEntries(Object.entries(totalOverrides.value)
    .filter(([uuid]) => prefills.has(uuid) && lastPrefills.get(uuid) === prefills.get(uuid)));
  lastPrefills = prefills;
});

const setTotal = (productUuid: string, value: number | undefined) => {
  totalOverrides.value = { ...totalOverrides.value, [productUuid]: value };
};

/** What is compared to tell whether anything changed. Row keys and product details are left out. */
const snapshotOf = () => JSON.stringify({
  ...form.value,
  date: form.value.date?.getTime(),
  lines: lines.value.map(({ productUuid }) => productUuid),
  recipes: recipeRows.value.map(({ recipeUuid, persons }) => ({ recipeUuid, persons })),
  totals: totals.value,
});
const savedSnapshot = ref(snapshotOf());
const isDirty = computed(() => snapshotOf() !== savedSnapshot.value);

useUnsavedChanges(isDirty);

const isFuture = (date: Date) => fromPickerDate(date).getTime() > Date.now();

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
  isLoading.value = true;
  hasError.value = false;
  try {
    const [recipes, doc, kitchenQuantities] = await Promise.all([
      OptionsService.recipes(),
      props.uuid ? StockOutService.get(props.uuid) : null,
      KITCHEN_BALANCE_ENABLED ? OptionsService.kitchenBalance() : [],
    ]);
    kitchen.value = new Map(kitchenQuantities.map((item) => [item.productUuid, item.quantity]));
    if (!doc) {
      recipeOptions.value = recipes;
      savedSnapshot.value = snapshotOf();
      return;
    }
    // Only the creator edits; the API refuses anyone else too.
    if (doc.createdBy.uuid !== authStore.user?.uuid) {
      await router.replace(backRoute.value);
      return;
    }
    original.value = doc;
    // The saved doc is already in the kitchen balance: take its part (given − needed) back out.
    if (doc.department === StockOutDepartment.KITCHEN) {
      for (const line of doc.lines) {
        const own = line.quantity - line.neededQuantity;
        kitchen.value.set(line.product.uuid, Number(((kitchen.value.get(line.product.uuid) ?? 0) - own).toFixed(RECIPE_QUANTITY_DECIMALS)));
      }
    }
    form.value = {
      reason: doc.reason,
      date: toPickerDate(new Date(doc.date)),
      supplierUuid: doc.supplier?.uuid ?? '',
      department: doc.department ?? StockOutDepartment.KITCHEN,
      receiverUuid: doc.receiver?.uuid ?? '',
      note: doc.note ?? '',
    };
    selectedSupplier.value = doc.supplier;
    selectedReceiver.value = doc.receiver;
    // A recipe the doc already has works from its saved copy - even if it was changed or archived since.
    const savedRecipes = doc.recipes.map(toSavedRecipeOption);
    const savedUuids = new Set(savedRecipes.map((recipe) => recipe.uuid));
    recipeOptions.value = [...savedRecipes, ...recipes.filter((recipe) => !savedUuids.has(recipe.uuid))];
    recipeRows.value = doc.recipes.map((row) => ({ ...emptyRecipeRow(row.persons), recipeUuid: row.recipe.uuid }));
    // The extras block lists the products in no recipe; every total comes back as saved.
    const extraLines = doc.lines
      .filter((line) => !line.neededQuantity)
      .map((line) => ({ ...emptyOutLine(), productUuid: line.product.uuid, product: line.product }));
    lines.value = extraLines.length ? extraLines : [emptyOutLine()];
    // Set the prefills first, so the watch above keeps the typed totals.
    lastPrefills = new Map(totalRows.value.map((row) => [row.product.uuid, row.prefill]));
    totalOverrides.value = Object.fromEntries(doc.lines
      .filter((line) => line.quantity !== lastPrefills.get(line.product.uuid))
      .map((line) => [line.product.uuid, line.quantity]));
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
  date: fromPickerDate(form.value.date).toISOString(),
  supplierUuid: isReturned.value ? form.value.supplierUuid || null : null,
  department: isIssued.value ? form.value.department || null : null,
  receiverUuid: isIssued.value ? form.value.receiverUuid || null : null,
  note: form.value.note.trim() || null,
  recipes: isIssued.value ? recipeRows.value.map((row) => ({ recipeUuid: row.recipeUuid, persons: row.persons! })) : [],
  lines: totalRows.value.map((row) => ({
    productUuid: row.product.uuid,
    quantity: totals.value[row.product.uuid]!,
    extraQuantity: extraOf(totals.value[row.product.uuid]!, row.needed, row.product),
  })),
});

const save = async () => {
  const isHeaderValid = await formRef.value?.validate().catch(() => false);
  const invalidKey = !recipeRows.value.every((row) => row.recipeUuid && row.persons && row.persons >= 1)
    ? 'stockOut.form.recipesInvalid'
    : !totalRows.value.length
      ? 'stockOut.form.linesRequired'
      : totalRows.value.some((row) => totals.value[row.product.uuid] === undefined)
        ? 'stockOut.form.totalsInvalid'
        : null;
  showLineErrors.value = !!invalidKey;
  if (invalidKey) NotificationService.error(t(invalidKey));
  if (!isHeaderValid || invalidKey) return;

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

    <div v-else class="out-layout">
      <div class="out-layout__main">
        <AppCard>
          <SectionHeader :title="$t('stockOut.sections.details')" :hint="$t('stockOut.sections.detailsHint')">
            <template #icon><FileText :size="18" /></template>
          </SectionHeader>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
            <div class="form-row">
              <el-form-item :label="$t('stockOut.form.reason')" prop="reason">
                <!-- Recipes are for Issued only, so the reason stays while any recipe row is there. -->
                <ReasonSelect
                  v-model="form.reason"
                  :options="reasonOptions"
                  :label="$t('stockOut.form.reason')"
                  :disabled="recipeRows.length > 0"
                />
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
                <!-- An issue always goes to the kitchen. -->
                <el-select v-model="form.department" disabled :aria-label="$t('stockOut.form.department')">
                  <el-option
                    v-for="department in STOCK_OUT_DEPARTMENTS"
                    :key="department"
                    :label="departmentName(department)"
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
          <StockOutRecipesEditor
            v-model="recipeRows"
            :recipes="recipeOptions"
            :available="isIssued"
            :disabled="isSaving"
            :show-errors="showLineErrors"
          />
        </AppCard>

        <AppCard class="lines-card">
          <StockOutLinesEditor
            v-model="lines"
            :exclude-uuids="totalProductUuids"
            :totals="totals"
            :show-errors="showLineErrors"
            @update-total="setTotal"
            :supplied-by="isReturned ? form.supplierUuid || null : undefined"
          />
        </AppCard>
      </div>

      <!-- One wrapper, so on wide screens both panels stay in view together at the same height. -->
      <div class="out-layout__side">
        <StockOutPanel
          class="out-layout__summary"
          :groups="panelGroups"
          :recipe-count="panelGroups.filter((group) => group.persons).length"
          :product-count="totalRows.length"
          :highlighted="hoveredProduct"
          @hover="hoveredProduct = $event"
        />

        <StockOutTotalsPanel
          class="out-layout__totals"
          :rows="totalRows"
          :totals="totals"
          :kitchen="showKitchen ? kitchen : undefined"
          :show-errors="showLineErrors"
          :highlighted="hoveredProduct"
          @update="setTotal"
          @hover="hoveredProduct = $event"
        >
          <template #footer>
            <div class="out-actions">
              <el-button :disabled="isSaving" @click="router.push(backRoute)">{{ $t('common.cancel') }}</el-button>
              <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
            </div>
          </template>
        </StockOutTotalsPanel>
      </div>
    </div>
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

/* Element Plus sizes the date field by this variable, not by width; :deep as the picker has no single root for the scoped style. */
:deep(.stock-out-form__date) {
  --el-date-editor-width: 100%;
}

.lines-card {
  padding: 0;
  overflow: hidden;
}

/*
 * Small screens: everything in one column. 1200px+: the totals stay on the right, the summary goes
 * under the rows. 1550px+: summary and totals side by side on the right, both staying in view.
 */
.out-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.out-layout__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.out-actions {
  display: flex;
  gap: 0.5rem;
}

.out-actions .el-button {
  flex: 1;
  margin: 0;
}

/* Below 1550px the wrapper is left out of the layout, so each panel takes its own place. */
.out-layout__side {
  display: contents;
}

@media (min-width: 1200px) {
  .out-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(20rem, 24vw, 26rem);
    grid-template-areas:
      "main totals"
      "summary totals";
    grid-template-rows: auto 1fr;
    align-items: start;
  }

  .out-layout__main {
    grid-area: main;
  }

  .out-layout__summary {
    grid-area: summary;
  }

  /* The totals are what the storekeeper gives out, so they stay in view. */
  .out-layout__totals {
    grid-area: totals;
    position: sticky;
    top: calc(var(--header-height) + 1rem);
    max-height: calc(100dvh - var(--header-height) - 2rem);
  }
}

@media (min-width: 1550px) {
  .out-layout {
    grid-template-columns: minmax(0, 1fr) clamp(42rem, 40vw, 52rem);
    grid-template-areas: "main side";
    grid-template-rows: auto;
  }

  .out-layout__side {
    grid-area: side;
    position: sticky;
    top: calc(var(--header-height) + 1rem);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    align-items: start;
  }

  .out-layout__summary,
  .out-layout__totals {
    grid-area: auto;
    position: static;
    max-height: calc(100dvh - var(--header-height) - 2rem);
  }
}
</style>
