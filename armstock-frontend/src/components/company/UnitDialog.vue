<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { IUnit } from 'armstock-shared';
import { Ruler } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import { UnitService } from '../../services/UnitService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';

const props = defineProps<{
  /** null = add a new unit. */
  unit: IUnit | null;
}>();

const emit = defineEmits<{ saved: [unit: IUnit] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref({ name: '', shortName: '', allowsDecimals: false });

const isEdit = computed(() => !!props.unit);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('units.form.nameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
  shortName: [{ required: true, whitespace: true, message: () => t('units.form.shortNameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = {
    name: props.unit?.name ?? '',
    shortName: props.unit?.shortName ?? '',
    allowsDecimals: props.unit?.allowsDecimals ?? false,
  };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = {
    name: form.value.name.trim(),
    shortName: form.value.shortName.trim(),
    allowsDecimals: form.value.allowsDecimals,
  };

  isSaving.value = true;
  try {
    const saved = props.unit
      ? await UnitService.update(props.unit.uuid, payload)
      : await UnitService.create(payload);
    NotificationService.success(t(isEdit.value ? 'units.updated' : 'units.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'units.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'units.editTitle' : 'units.addTitle')"
    :subtitle="unit ? unit.name : $t('units.addSubtitle')"
    width="460px"
    :locked="isSaving"
  >
    <template #icon><Ruler :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <div class="form-row">
        <el-form-item :label="$t('units.form.name')" prop="name">
          <el-input v-model="form.name" maxlength="50" :placeholder="$t('units.form.namePlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('units.form.shortName')" prop="shortName">
          <el-input v-model="form.shortName" maxlength="10" :placeholder="$t('units.form.shortNamePlaceholder')" />
        </el-form-item>
      </div>

      <el-form-item prop="allowsDecimals">
        <el-checkbox v-model="form.allowsDecimals">{{ $t('units.form.allowsDecimals') }}</el-checkbox>
        <p class="field-hint">{{ $t('units.form.allowsDecimalsHint') }}</p>
      </el-form-item>

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
.field-hint {
  width: 100%;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
