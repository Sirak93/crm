<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormItemRule } from 'element-plus';
import { AccountType, PASSWORD_MIN_LENGTH, type ICompanyUser, type INamedRef, type IRole, type Permission } from 'armstock-shared';
import { Briefcase, Lock, Mail, RotateCcw, User, UserRound } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import RoleSelect from './RoleSelect.vue';
import PermissionPanel from './PermissionPanel.vue';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { toUserCreatePayload, toUserForm, toUserPayload } from '../../utils/formPayload';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';
import type { IUsersAccess } from '../../interfaces/IUsersAccess';

const props = defineProps<{
  api: ICompanyUsersApi;
  /** null = add a new user. */
  user: ICompanyUser | null;
  /** The logged-in user cannot change their own role or login. */
  currentUserUuid: string | null;
  roles: INamedRef[];
  /** The roles with their permissions - empty unless `access.canManageAccess`. */
  roleTemplates: IRole[];
  access: IUsersAccess;
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
const isOwner = computed(() => props.user?.accountType === AccountType.COMPANY_OWNER);
/** Name, position, login, email, password. */
const canEditBasic = computed(() => !isEdit.value || (isOwner.value ? props.access.canEditOwner : props.access.canEdit));
/** Picked on create; changed later only with the right to manage rights, never on your own account. */
const canEditRole = computed(() => !isEdit.value || (props.access.canManageAccess && !isSelf.value && !isOwner.value));
const canEditLogin = computed(() => canEditBasic.value && !isSelf.value && !isOwner.value);
/** The panel is shown only to those who manage permissions; read-only on your own account. */
const showPermissions = computed(() => form.value.canLogIn && !isOwner.value && props.access.canManageAccess);
const canEditPermissions = computed(() => props.access.canManageAccess && !isSelf.value && !isOwner.value);
/** A user who already has a password may leave the field empty to keep it. */
const keepsPassword = computed(() => !!props.user?.hasPassword);

const required = (key: string): FormItemRule => ({ required: true, whitespace: true, message: () => t(key), trigger: REQUIRED_RULE_TRIGGER });

const rules = computed(() => ({
  firstName: [required('forms.user.firstNameRequired')],
  lastName: [required('forms.user.lastNameRequired')],
  roleUuid: isOwner.value ? [] : [{ required: true, message: () => t('forms.user.roleRequired'), trigger: 'change' } as FormItemRule],
  email: [
    ...(form.value.canLogIn ? [required('forms.emailRequired')] : []),
    { type: 'email', message: () => t('forms.emailInvalid'), trigger: 'blur' } as FormItemRule,
  ],
  password: [
    ...(form.value.canLogIn && !keepsPassword.value ? [required('forms.user.passwordRequired')] : []),
    { min: PASSWORD_MIN_LENGTH, message: () => t('forms.user.passwordMin', { count: PASSWORD_MIN_LENGTH }), trigger: 'blur' } as FormItemRule,
  ],
}));

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = toUserForm(props.user);
  formRef.value?.clearValidate();
});

const rolePermissions = (roleUuid: string): Permission[] => [...(props.roleTemplates.find((r) => r.uuid === roleUuid)?.permissions ?? [])];

const resetToRole = () => {
  form.value.permissions = rolePermissions(form.value.roleUuid);
};

const onRoleChange = () => {
  if (canEditPermissions.value) resetToRole();
};

/** Permissions were emptied when login was turned off - start again from the role. */
const onLoginChange = (canLogIn: string | number | boolean) => {
  if (canLogIn && canEditPermissions.value && !form.value.permissions.length) resetToRole();
};

const sameSet = (a: Permission[], b: Permission[]) => a.length === b.length && a.every((p) => b.includes(p));

/**
 * Edit saves the basic data, then the role and permissions, through their own endpoints - each needs its own
 * right. Basic data goes first: turning login on there is what lets the user hold permissions.
 */
const saveEdit = async (user: ICompanyUser): Promise<ICompanyUser> => {
  let saved = user;
  if (canEditBasic.value) saved = await props.api.update(user.uuid, toUserPayload(form.value));
  const permissions = form.value.canLogIn ? form.value.permissions : [];
  const accessChanged = form.value.roleUuid !== saved.role?.uuid || !sameSet(permissions, saved.permissions);
  if (canEditPermissions.value && props.api.setAccess && accessChanged) {
    saved = await props.api.setAccess(user.uuid, { roleUuid: form.value.roleUuid, permissions });
  }
  return saved;
};

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  isSaving.value = true;
  try {
    const saved = props.user ? await saveEdit(props.user) : await props.api.create(toUserCreatePayload(form.value, canEditPermissions.value));
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
    :width="showPermissions ? '760px' : '520px'"
  >
    <template #icon><UserRound :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <div class="form-row">
        <el-form-item :label="$t('forms.user.firstName')" prop="firstName">
          <el-input v-model="form.firstName" maxlength="100" autocomplete="off" :disabled="!canEditBasic">
            <template #prefix><User :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('forms.user.lastName')" prop="lastName">
          <el-input v-model="form.lastName" maxlength="100" autocomplete="off" :disabled="!canEditBasic">
            <template #prefix><User :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </div>

      <div class="form-row">
        <el-form-item :label="$t('forms.user.position')" prop="position">
          <el-input
            v-model="form.position"
            maxlength="100"
            :placeholder="$t('forms.user.positionPlaceholder')"
            :disabled="!canEditBasic"
          >
            <template #prefix><Briefcase :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="!isOwner" :label="$t('forms.user.role')" prop="roleUuid">
          <RoleSelect v-model="form.roleUuid" :options="roles" :disabled="!canEditRole" @update:model-value="onRoleChange" />
        </el-form-item>
      </div>

      <el-form-item v-if="!isOwner">
        <el-switch
          v-model="form.canLogIn"
          :active-text="$t('forms.user.canLogIn')"
          :disabled="!canEditLogin"
          @change="onLoginChange"
        />
      </el-form-item>

      <el-form-item v-if="form.canLogIn" :label="$t('forms.email')" prop="email">
        <el-input v-model="form.email" type="email" maxlength="255" autocomplete="off" :disabled="!canEditBasic">
          <template #prefix><Mail :size="16" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>

      <el-form-item v-if="form.canLogIn && canEditBasic" :label="$t('forms.user.password')" prop="password">
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
      <div v-if="showPermissions" class="permissions-block">
        <div class="permissions-block__head">
          <span class="permissions-block__title">{{ $t('permissions.title') }}</span>
          <el-button v-if="canEditPermissions" size="small" :disabled="!form.roleUuid" @click="resetToRole">
            <RotateCcw :size="14" aria-hidden="true" />
            <span>{{ $t('permissions.resetToRole') }}</span>
          </el-button>
        </div>
        <p v-if="!canEditPermissions" class="permissions-block__hint">{{ $t('permissions.ownAccountHint') }}</p>
        <PermissionPanel v-model="form.permissions" :disabled="!canEditPermissions" />
      </div>
      <p v-if="!form.canLogIn" class="no-login-hint">{{ $t('forms.user.noLoginHint') }}</p>

      <!-- Lets Enter submit the form. -->
      <button type="submit" hidden />
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="isSaving" :disabled="!canEditBasic && !canEditRole" @click="save">
        {{ $t('common.save') }}
      </el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
.no-login-hint {
  margin: 0 0 1rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.permissions-block {
  margin-bottom: 1rem;
}

.permissions-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.permissions-block__title {
  font-weight: 600;
  color: var(--text-dark);
}

.permissions-block__hint {
  margin: 0 0 0.5rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
