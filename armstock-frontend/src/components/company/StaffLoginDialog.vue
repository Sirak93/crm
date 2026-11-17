<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormItemRule } from 'element-plus';
import type { ICompanyStaff, UserRole } from 'armstock-shared';
import { KeyRound } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import LoginFormFields from './LoginFormFields.vue';
import RoleSelect from './RoleSelect.vue';
import { CompanyStaffService } from '../../services/company/CompanyStaffService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';

const props = defineProps<{
  staff: ICompanyStaff | null;
}>();

const emit = defineEmits<{ saved: [staff: ICompanyStaff] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref({ email: '', password: '', role: undefined as UserRole | undefined });

const roleRules: FormItemRule[] = [
  { required: true, message: () => t('forms.login.roleRequired'), trigger: 'change' },
];

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = { email: '', password: '', role: undefined };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!props.staff || !(await formRef.value?.validate().catch(() => false))) return;

  isSaving.value = true;
  try {
    const saved = await CompanyStaffService.giveLogin(props.staff.uuid, {
      email: form.value.email.trim(),
      password: form.value.password,
      role: form.value.role!,
    });
    NotificationService.success(t('company.staff.loginGiven'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'company.staff.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t('company.staff.loginTitle')"
    :subtitle="staff ? `${staff.firstName} ${staff.lastName}` : ''"
    :locked="isSaving"
  >
    <template #icon><KeyRound :size="20" /></template>

    <el-form ref="formRef" :model="form" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <LoginFormFields v-model="form" />
      <el-form-item :label="$t('forms.login.role')" prop="role" :rules="roleRules">
        <RoleSelect v-model="form.role" />
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
