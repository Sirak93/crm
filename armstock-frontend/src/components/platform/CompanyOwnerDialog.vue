<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance } from 'element-plus';
import type { ICompany } from 'armstock-shared';
import { UserPlus } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import StaffFormFields from '../company/StaffFormFields.vue';
import LoginFormFields from '../company/LoginFormFields.vue';
import { PlatformCompaniesService } from '../../services/platform/PlatformCompaniesService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { toStaffForm, toStaffPayload } from '../../utils/formPayload';

const props = defineProps<{
  company: ICompany | null;
}>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref({ ...toStaffForm(null), email: '', password: '' });

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = { ...toStaffForm(null), email: '', password: '' };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!props.company || !(await formRef.value?.validate().catch(() => false))) return;

  isSaving.value = true;
  try {
    await PlatformCompaniesService.addOwner(props.company.uuid, {
      ...toStaffPayload(form.value),
      email: form.value.email.trim(),
      password: form.value.password,
    });
    NotificationService.success(t('platform.companies.owner.added'));
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'platform.companies.owner.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t('platform.companies.owner.title')"
    :subtitle="company?.name"
    :locked="isSaving"
  >
    <template #icon><UserPlus :size="20" /></template>

    <el-form ref="formRef" :model="form" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <StaffFormFields v-model="form" />
      <LoginFormFields v-model="form" />
      <!-- Lets Enter submit the form. -->
      <button type="submit" hidden />
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </AppDialog>
</template>
