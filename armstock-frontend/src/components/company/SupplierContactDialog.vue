<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { ISupplier, ISupplierContact } from 'armstock-shared';
import { BriefcaseBusiness, Phone, UserRound } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import { SupplierService } from '../../services/SupplierService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';

const props = defineProps<{
  /** The firm the contact belongs to. */
  supplier: ISupplier | null;
  /** null = add a new contact. */
  contact: ISupplierContact | null;
}>();

const emit = defineEmits<{ saved: [supplierUuid: string, contact: ISupplierContact] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref({ name: '', position: '', phone: '', note: '' });

const isEdit = computed(() => !!props.contact);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('supplierContacts.form.nameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  const c = props.contact;
  form.value = { name: c?.name ?? '', position: c?.position ?? '', phone: c?.phone ?? '', note: c?.note ?? '' };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!props.supplier || !(await formRef.value?.validate().catch(() => false))) return;

  const payload = {
    name: form.value.name.trim(),
    position: form.value.position.trim() || null,
    phone: form.value.phone.trim() || null,
    note: form.value.note.trim() || null,
  };

  const supplierUuid = props.supplier.uuid;
  isSaving.value = true;
  try {
    const saved = props.contact
      ? await SupplierService.updateContact(supplierUuid, props.contact.uuid, payload)
      : await SupplierService.addContact(supplierUuid, payload);
    NotificationService.success(t(isEdit.value ? 'supplierContacts.updated' : 'supplierContacts.created'));
    emit('saved', supplierUuid, saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'supplierContacts.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'supplierContacts.editTitle' : 'supplierContacts.addTitle')"
    :subtitle="supplier?.name"
    :locked="isSaving"
  >
    <template #icon><UserRound :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <div class="form-row">
        <el-form-item :label="$t('supplierContacts.form.name')" prop="name">
          <el-input v-model="form.name" maxlength="200">
            <template #prefix><UserRound :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('supplierContacts.form.position')" prop="position">
          <el-input v-model="form.position" maxlength="100" :placeholder="$t('supplierContacts.form.positionPlaceholder')">
            <template #prefix><BriefcaseBusiness :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </div>

      <el-form-item :label="$t('supplierContacts.form.phone')" prop="phone">
        <el-input v-model="form.phone" type="tel" maxlength="50" :placeholder="$t('supplierContacts.form.optional')">
          <template #prefix><Phone :size="16" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>

      <el-form-item :label="$t('supplierContacts.form.note')" prop="note">
        <el-input
          v-model="form.note"
          type="textarea"
          :rows="2"
          maxlength="500"
          :placeholder="$t('supplierContacts.form.notePlaceholder')"
        />
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
