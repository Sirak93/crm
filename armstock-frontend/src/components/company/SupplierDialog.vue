<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { ISupplier } from 'armstock-shared';
import { FileText, Truck } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import SupplierContactsField from './SupplierContactsField.vue';
import { SupplierService } from '../../services/SupplierService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';
import type { ISupplierContactForm } from '../../interfaces/ISupplierContactForm';

const props = defineProps<{
  /** null = add a new supplier. */
  supplier: ISupplier | null;
}>();

const emit = defineEmits<{ saved: [supplier: ISupplier] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref({ name: '', taxId: '', note: '', contacts: [] as ISupplierContactForm[] });

const isEdit = computed(() => !!props.supplier);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('suppliers.form.nameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  const s = props.supplier;
  form.value = {
    name: s?.name ?? '',
    taxId: s?.taxId ?? '',
    note: s?.note ?? '',
    contacts: (s?.contacts ?? []).map((c) => ({ key: c.uuid, name: c.name, position: c.position ?? '', phone: c.phone ?? '' })),
  };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = {
    name: form.value.name.trim(),
    taxId: form.value.taxId.trim() || null,
    note: form.value.note.trim() || null,
    contacts: form.value.contacts.map((c) => ({
      name: c.name.trim(),
      position: c.position.trim() || null,
      phone: c.phone.trim() || null,
    })),
  };

  isSaving.value = true;
  try {
    const saved = props.supplier
      ? await SupplierService.update(props.supplier.uuid, payload)
      : await SupplierService.create(payload);
    NotificationService.success(t(isEdit.value ? 'suppliers.updated' : 'suppliers.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'suppliers.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    width="680px"
    :title="$t(isEdit ? 'suppliers.editTitle' : 'suppliers.addTitle')"
    :subtitle="supplier ? supplier.name : $t('suppliers.addSubtitle')"
    :locked="isSaving"
  >
    <template #icon><Truck :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <div class="form-row">
        <el-form-item :label="$t('suppliers.form.name')" prop="name">
          <el-input v-model="form.name" maxlength="200" :placeholder="$t('suppliers.form.namePlaceholder')">
            <template #prefix><Truck :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('suppliers.form.taxId')" prop="taxId">
          <el-input v-model="form.taxId" maxlength="50" :placeholder="$t('suppliers.form.optional')">
            <template #prefix><FileText :size="16" aria-hidden="true" /></template>
          </el-input>
        </el-form-item>
      </div>

      <SupplierContactsField v-model="form.contacts" />

      <el-form-item :label="$t('suppliers.form.note')" prop="note">
        <el-input v-model="form.note" type="textarea" :rows="2" maxlength="1000" :placeholder="$t('suppliers.form.optional')" />
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
