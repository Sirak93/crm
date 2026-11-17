<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { ICompany, ICompanyPayload } from 'armstock-shared';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';

const props = defineProps<{
  /** null = add a new company. */
  company: ICompany | null;
}>();

const emit = defineEmits<{ saved: [company: ICompany] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = reactive({ name: '', taxId: '', phone: '', email: '', address: '' });

const isEdit = computed(() => !!props.company);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('platform.companies.form.nameRequired'), trigger: 'blur' }],
  email: [{ type: 'email', message: () => t('platform.companies.form.emailInvalid'), trigger: 'blur' }],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  const c = props.company;
  Object.assign(form, {
    name: c?.name ?? '',
    taxId: c?.taxId ?? '',
    phone: c?.phone ?? '',
    email: c?.email ?? '',
    address: c?.address ?? '',
  });
  formRef.value?.clearValidate();
});

const orNull = (value: string) => value.trim() || null;

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload: ICompanyPayload = {
    name: form.name.trim(),
    taxId: orNull(form.taxId),
    phone: orNull(form.phone),
    email: orNull(form.email),
    address: orNull(form.address),
  };

  isSaving.value = true;
  try {
    const saved = props.company
      ? await PlatformCompaniesService.update(props.company.uuid, payload)
      : await PlatformCompaniesService.create(payload);
    NotificationService.success(t(isEdit.value ? 'platform.companies.updated' : 'platform.companies.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'platform.companies.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <el-dialog
    v-model="open"
    :title="$t(isEdit ? 'platform.companies.editTitle' : 'platform.companies.addTitle')"
    width="min(560px, calc(100vw - 32px))"
    :close-on-click-modal="!isSaving"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="isSaving"
      @submit.prevent="save"
    >
      <el-form-item :label="$t('platform.companies.form.name')" prop="name">
        <el-input v-model="form.name" maxlength="255" />
      </el-form-item>

      <div class="form-row">
        <el-form-item :label="$t('platform.companies.form.taxId')" prop="taxId">
          <el-input v-model="form.taxId" maxlength="50" />
        </el-form-item>
        <el-form-item :label="$t('platform.companies.form.phone')" prop="phone">
          <el-input v-model="form.phone" type="tel" maxlength="50" />
        </el-form-item>
      </div>

      <el-form-item :label="$t('platform.companies.form.email')" prop="email">
        <el-input v-model="form.email" type="email" maxlength="255" />
      </el-form-item>

      <el-form-item :label="$t('platform.companies.form.address')" prop="address">
        <el-input v-model="form.address" maxlength="500" />
      </el-form-item>

      <!-- Lets Enter submit the form. -->
      <button type="submit" hidden />
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 1rem;
}

@media (min-width: 576px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
