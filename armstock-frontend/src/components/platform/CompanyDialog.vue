<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormItemRule } from 'element-plus';
import { PASSWORD_MIN_LENGTH, type ICompany } from 'armstock-shared';
import { Building2, Lock, Mail, User } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import CompanyFormFields from '../company/CompanyFormFields.vue';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { emptyCompanyCreateForm, toCompanyCreatePayload, toCompanyForm, toCompanyPayload } from '../../utils/formPayload';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';

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
// The Owner part is used only when adding - a company is always created with its one Owner.
const form = ref(emptyCompanyCreateForm());

const isEdit = computed(() => !!props.company);

const required = (key: string): FormItemRule => ({ required: true, whitespace: true, message: () => t(key), trigger: REQUIRED_RULE_TRIGGER });

const ownerRules = {
  'owner.firstName': [required('forms.user.firstNameRequired')],
  'owner.lastName': [required('forms.user.lastNameRequired')],
  'owner.email': [required('forms.emailRequired'), { type: 'email', message: () => t('forms.emailInvalid'), trigger: 'blur' } as FormItemRule],
  'owner.password': [
    required('forms.user.passwordRequired'),
    { min: PASSWORD_MIN_LENGTH, message: () => t('forms.user.passwordMin', { count: PASSWORD_MIN_LENGTH }), trigger: 'blur' } as FormItemRule,
  ],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = { ...emptyCompanyCreateForm(), ...toCompanyForm(props.company) };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  isSaving.value = true;
  try {
    const saved = props.company
      ? await PlatformCompaniesService.update(props.company.uuid, toCompanyPayload(form.value))
      : await PlatformCompaniesService.create(toCompanyCreatePayload(form.value));
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
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'platform.companies.editTitle' : 'platform.companies.addTitle')"
    :subtitle="company ? company.name : $t('platform.companies.addSubtitle')"
    :locked="isSaving"
  >
    <template #icon><Building2 :size="20" /></template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="isEdit ? {} : ownerRules"
      label-position="top"
      :disabled="isSaving"
      @submit.prevent="save"
    >
      <CompanyFormFields v-model="form" />

      <template v-if="!isEdit">
        <h3 class="owner-heading">{{ $t('platform.companies.ownerHeading') }}</h3>
        <p class="owner-hint">{{ $t('platform.companies.ownerHint') }}</p>
        <div class="form-row">
          <el-form-item :label="$t('forms.user.firstName')" prop="owner.firstName">
            <el-input v-model="form.owner.firstName" maxlength="100" autocomplete="off">
              <template #prefix><User :size="16" aria-hidden="true" /></template>
            </el-input>
          </el-form-item>
          <el-form-item :label="$t('forms.user.lastName')" prop="owner.lastName">
            <el-input v-model="form.owner.lastName" maxlength="100" autocomplete="off">
              <template #prefix><User :size="16" aria-hidden="true" /></template>
            </el-input>
          </el-form-item>
        </div>
        <el-form-item :label="$t('forms.email')" prop="owner.email">
          <el-input v-model="form.owner.email" type="email" maxlength="255" autocomplete="off">
            <template #prefix><Mail :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('forms.user.password')" prop="owner.password">
          <el-input v-model="form.owner.password" type="password" show-password maxlength="72" autocomplete="new-password">
            <template #prefix><Lock :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </template>
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
.owner-heading {
  margin: 0.5rem 0 0.25rem;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-main);
}

.owner-hint {
  margin: 0 0 0.75rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
