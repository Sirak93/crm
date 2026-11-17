<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ICompanyStaff, UserRole } from 'armstock-shared';
import { UserCog } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
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

const isSaving = ref(false);
const role = ref<UserRole | undefined>();

watch(open, (isOpen) => {
  if (isOpen) role.value = props.staff?.login?.role;
});

const save = async () => {
  if (!props.staff || role.value === undefined) return;

  isSaving.value = true;
  try {
    const saved = await CompanyStaffService.setRole(props.staff.uuid, role.value);
    NotificationService.success(t('company.staff.roleChanged'));
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
    :title="$t('company.staff.roleTitle')"
    :subtitle="staff ? `${staff.firstName} ${staff.lastName}` : ''"
    width="420px"
    :locked="isSaving"
  >
    <template #icon><UserCog :size="20" /></template>

    <el-form label-position="top" :disabled="isSaving" @submit.prevent="save">
      <el-form-item :label="$t('forms.login.role')">
        <RoleSelect v-model="role" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="isSaving"
        :disabled="role === undefined || role === staff?.login?.role"
        @click="save"
      >
        {{ $t('common.save') }}
      </el-button>
    </template>
  </AppDialog>
</template>
