<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { IRole, IRolePayload, Permission } from 'armstock-shared';
import { ShieldCheck } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import PermissionPanel from './PermissionPanel.vue';
import { RoleService } from '../../services/company/RoleService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';

const props = defineProps<{
  /** null = add a new role. */
  role: IRole | null;
  /** Shown but not changeable (owner-only permissions for a member). */
  locked: readonly Permission[];
}>();

const emit = defineEmits<{ saved: [role: IRole] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref<{ name: string; permissions: Permission[] }>({ name: '', permissions: [] });

const isEdit = computed(() => !!props.role);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('roles.form.nameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = { name: props.role?.name ?? '', permissions: [...(props.role?.permissions ?? [])] };
  formRef.value?.clearValidate();
});

const permissionsChanged = (role: IRole) =>
  role.permissions.length !== form.value.permissions.length || role.permissions.some((p) => !form.value.permissions.includes(p));

/** Edit with changed permissions and users on the role: asks whether to apply; null = cancelled. */
const askApplyToUsers = async (): Promise<boolean | null> => {
  const role = props.role;
  if (!role || !role.userCount || !permissionsChanged(role)) return false;
  return NotificationService.ask(
    t('roles.applyTitle'),
    t('roles.applyText', role.userCount),
    t('roles.applyYes'),
    t('roles.applyNo'),
  );
};

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const applyToUsers = await askApplyToUsers();
  if (applyToUsers === null) return;

  const payload: IRolePayload = { name: form.value.name.trim(), permissions: form.value.permissions };
  if (props.role) payload.applyToUsers = applyToUsers;

  isSaving.value = true;
  try {
    const saved = props.role
      ? await RoleService.update(props.role.uuid, payload)
      : await RoleService.create(payload);
    NotificationService.success(t(isEdit.value ? 'roles.updated' : 'roles.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'roles.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'roles.editTitle' : 'roles.addTitle')"
    :subtitle="role ? role.name : $t('roles.addSubtitle')"
    width="760px"
    :locked="isSaving"
  >
    <template #icon><ShieldCheck :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <el-form-item :label="$t('roles.form.name')" prop="name">
        <el-input v-model="form.name" maxlength="100" :placeholder="$t('roles.form.namePlaceholder')" />
      </el-form-item>

      <el-form-item :label="$t('permissions.title')">
        <p class="field-hint">{{ $t('roles.form.permissionsHint') }}</p>
        <PermissionPanel v-model="form.permissions" :disabled="isSaving" :locked="locked" class="role-permissions" />
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
  margin: 0 0 0.5rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.role-permissions {
  width: 100%;
}
</style>
