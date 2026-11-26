<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { PRODUCT_MEASURE_UNITS, type IProduct, type IProductCategory, type MeasureUnit } from 'armstock-shared';
import { Barcode, Package, ScanBarcode } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import { ProductService } from '../../services/ProductService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useMeasureUnits } from '../../composables/useMeasureUnits';
import { BARCODE_MAX_LENGTH } from 'armstock-shared';
import { BARCODE_INPUT_ATTR, REQUIRED_RULE_TRIGGER, SCANNER_ENABLED } from '../../constants/constants';

const props = defineProps<{
  /** null = add a new product. */
  product: IProduct | null;
  categories: IProductCategory[];
  /** Pre-fills the name of a new product, e.g. with what was typed in a search. */
  initialName?: string;
  /** Pre-fills the barcode of a new product - the one just scanned. */
  initialBarcode?: string;
}>();

const emit = defineEmits<{ saved: [product: IProduct] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const { unitName, unitShortName } = useMeasureUnits();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref<{ name: string; code: string; barcode: string; measureUnit: MeasureUnit | undefined; categoryUuid: string }>({
  name: '',
  code: '',
  barcode: '',
  measureUnit: undefined,
  categoryUuid: '',
});

const isEdit = computed(() => !!props.product);

const required = (key: string) => [{ required: true, whitespace: true, message: () => t(key), trigger: REQUIRED_RULE_TRIGGER }];

const rules: FormRules = {
  name: required('products.form.nameRequired'),
  measureUnit: [{ required: true, message: () => t('products.form.unitRequired'), trigger: REQUIRED_RULE_TRIGGER }],
  categoryUuid: required('products.form.categoryRequired'),
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  const p = props.product;
  form.value = {
    name: p?.name ?? props.initialName ?? '',
    code: p?.code ?? '',
    barcode: p?.barcode ?? props.initialBarcode ?? '',
    measureUnit: p?.measureUnit,
    categoryUuid: p?.category.uuid ?? '',
  };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = {
    name: form.value.name.trim(),
    code: form.value.code.trim() || null,
    barcode: form.value.barcode.trim() || null,
    categoryUuid: form.value.categoryUuid,
  };

  isSaving.value = true;
  try {
    const saved = props.product
      ? await ProductService.update(props.product.uuid, payload)
      : await ProductService.create({ ...payload, measureUnit: form.value.measureUnit! });
    NotificationService.success(t(isEdit.value ? 'products.updated' : 'products.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'products.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'products.editTitle' : 'products.addTitle')"
    :subtitle="product ? product.name : $t('products.addSubtitle')"
    :locked="isSaving"
  >
    <template #icon><Package :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <div class="form-row">
        <el-form-item :label="$t('products.form.name')" prop="name">
          <el-input v-model="form.name" maxlength="200">
            <template #prefix><Package :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('products.form.code')" prop="code">
          <el-input v-model="form.code" maxlength="50" :placeholder="$t('products.form.codePlaceholder')">
            <template #prefix><Barcode :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </div>

      <div v-if="SCANNER_ENABLED" class="form-row">
        <el-form-item :label="$t('products.form.barcode')" prop="barcode">
          <!-- Enter is the scanner's end key here, not "save". -->
          <el-input
            v-model="form.barcode"
            v-bind="{ [BARCODE_INPUT_ATTR]: '' }"
            :maxlength="BARCODE_MAX_LENGTH"
            :placeholder="$t('products.form.barcodePlaceholder')"
            @keydown.enter.prevent
          >
            <template #prefix><ScanBarcode :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item :label="$t('products.form.unit')" prop="measureUnit">
          <el-select
            v-model="form.measureUnit"
            :disabled="isEdit"
            :placeholder="$t('products.form.unitPlaceholder')"
            filterable
            class="full-width"
          >
            <el-option
              v-for="unit in PRODUCT_MEASURE_UNITS"
              :key="unit"
              :label="`${unitName(unit)} (${unitShortName(unit)})`"
              :value="unit"
            />
          </el-select>
          <p class="field-hint">{{ $t(isEdit ? 'products.form.unitLocked' : 'products.form.unitHint') }}</p>
        </el-form-item>
        <el-form-item :label="$t('products.form.category')" prop="categoryUuid">
          <el-select v-model="form.categoryUuid" :placeholder="$t('products.form.categoryPlaceholder')" filterable class="full-width">
            <el-option v-for="category in categories" :key="category.uuid" :label="category.name" :value="category.uuid" />
          </el-select>
        </el-form-item>
      </div>

      <!-- Lets Enter submit the form. -->
      <button type="submit" hidden />
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
.full-width {
  width: 100%;
}

.field-hint {
  width: 100%;
  margin: 4px 0 0;
  font-size: var(--text-xs);
  line-height: 1.4;
  color: var(--text-muted);
  /* Keeps the hint's line breaks (one example per row). */
  white-space: pre-line;
}
</style>
