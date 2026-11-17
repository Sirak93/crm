<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance } from 'element-plus';
import type { ICompanyStaff } from 'armstock-shared';
import { UserRound } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import StaffFormFields from './StaffFormFields.vue';
import { CompanyStaffService } from '../../services/company/CompanyStaffService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { toStaffForm, toStaffPayload } from '../../utils/formPayload';

const props = defineProps<{
  /** null = add a new staff member. */
  staff: ICompanyStaff | null;
}>();

const emit = defineEmits<{ saved: [staff: ICompanyStaff] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref(toStaffForm(null));

const isEdit = computed(() => !!props.staff);

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = toStaffForm(props.staff);
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = toStaffPayload(form.value);
  isSaving.value = true;
  try {
    const saved = props.staff
      ? await CompanyStaffService.update(props.staff.uuid, payload)
      : await CompanyStaffService.create(payload);
    NotificationService.success(t(isEdit.value ? 'company.staff.updated' : 'company.staff.created'));
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
    :title="$t(isEdit ? 'company.staff.editTitle' : 'company.staff.addTitle')"
    :subtitle="staff ? `${staff.firstName} ${staff.lastName}` : $t('company.staff.addSubtitle')"
    :locked="isSaving"
  >
    <template #icon><UserRound :size="20" /></template>

    <el-form ref="formRef" :model="form" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <StaffFormFields v-model="form" />
      <!-- Lets Enter submit the form. -->
      <button type="submit" hidden />
    </el-form>

    <template #footer>
      <el-button :disabled="isSaving" @click="open = false">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
    </template>
  </AppDialog>
</template>
