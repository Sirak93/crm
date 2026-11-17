<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormItemRule } from 'element-plus';
import { COMPANY_LOGIN_ROLES, PASSWORD_MIN_LENGTH, type ICompanyUser } from 'armstock-shared';
import { Briefcase, Lock, Mail, User, UserRound } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import RoleSelect from './RoleSelect.vue';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { toUserForm, toUserPayload } from '../../utils/formPayload';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';

const props = defineProps<{
  api: ICompanyUsersApi;
  /** null = add a new user. */
  user: ICompanyUser | null;
  /** The logged-in user cannot change their own role. */
  currentUserUuid: string | null;
}>();

const emit = defineEmits<{ saved: [user: ICompanyUser] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref(toUserForm(null));

const isEdit = computed(() => !!props.user);
const isSelf = computed(() => !!props.user && props.user.uuid === props.currentUserUuid);
const canLogIn = computed(() => !!form.value.role && COMPANY_LOGIN_ROLES.includes(form.value.role));
/** A user who already has a password may leave the field empty to keep it. */
const keepsPassword = computed(() => !!props.user?.hasPassword);

const required = (key: string, trigger = 'blur'): FormItemRule => ({ required: true, whitespace: true, message: () => t(key), trigger });

const rules = computed(() => ({
  firstName: [required('forms.user.firstNameRequired')],
  lastName: [required('forms.user.lastNameRequired')],
  role: [required('forms.user.roleRequired', 'change')],
  email: [
    ...(canLogIn.value ? [required('forms.emailRequired')] : []),
    { type: 'email', message: () => t('forms.emailInvalid'), trigger: 'blur' } as FormItemRule,
  ],
  password: [
    ...(canLogIn.value && !keepsPassword.value ? [required('forms.user.passwordRequired')] : []),
    { min: PASSWORD_MIN_LENGTH, message: () => t('forms.user.passwordMin', { count: PASSWORD_MIN_LENGTH }), trigger: 'blur' } as FormItemRule,
  ],
}));

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = toUserForm(props.user);
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = toUserPayload(form.value);
  isSaving.value = true;
  try {
    const saved = props.user ? await props.api.update(props.user.uuid, payload) : await props.api.create(payload);
    NotificationService.success(t(isEdit.value ? 'companyUsers.updated' : 'companyUsers.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'companyUsers.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'companyUsers.editTitle' : 'companyUsers.addTitle')"
    :subtitle="user ? `${user.firstName} ${user.lastName}` : $t('companyUsers.addSubtitle')"
    :locked="isSaving"
  >
    <template #icon><UserRound :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <div class="form-row">
        <el-form-item :label="$t('forms.user.firstName')" prop="firstName">
          <el-input v-model="form.firstName" maxlength="100" autocomplete="off">
            <template #prefix><User :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('forms.user.lastName')" prop="lastName">
          <el-input v-model="form.lastName" maxlength="100" autocomplete="off">
            <template #prefix><User :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item :label="$t('forms.user.position')" prop="position">
          <el-input v-model="form.position" maxlength="100" :placeholder="$t('forms.user.positionPlaceholder')">
            <template #prefix><Briefcase :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('forms.user.role')" prop="role">
          <RoleSelect v-model="form.role" :disabled="isSelf" />
        </el-form-item>
      </div>

      <el-form-item :label="$t('forms.email')" prop="email">
        <el-input v-model="form.email" type="email" maxlength="255" autocomplete="off">
          <template #prefix><Mail :size="16" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>

      <el-form-item v-if="canLogIn" :label="$t('forms.user.password')" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          maxlength="72"
          autocomplete="new-password"
          :placeholder="keepsPassword ? $t('forms.user.passwordKeep') : ''"
        >
          <template #prefix><Lock :size="16" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>
      <p v-else class="no-login-hint">{{ $t('forms.user.noLoginHint') }}</p>

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
.no-login-hint {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
