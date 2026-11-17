<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance } from 'element-plus';
import type { ICompany } from 'armstock-shared';
import { Building2 } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import CompanyFormFields from '../company/CompanyFormFields.vue';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { toCompanyForm, toCompanyPayload } from '../../utils/formPayload';

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
const form = ref(toCompanyForm(null));

const isEdit = computed(() => !!props.company);

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = toCompanyForm(props.company);
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = toCompanyPayload(form.value);
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
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'platform.companies.editTitle' : 'platform.companies.addTitle')"
    :subtitle="company ? company.name : $t('platform.companies.addSubtitle')"
    :locked="isSaving"
  >
    <template #icon><Building2 :size="20" /></template>

    <el-form ref="formRef" :model="form" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <CompanyFormFields v-model="form" />
      <!-- Lets Enter submit the form. -->
      <button type="submit" hidden />
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </AppDialog>
</template>
