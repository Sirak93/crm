<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { IProductCategory } from 'armstock-shared';
import { Tag } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import { ProductCategoryService } from '../../services/ProductCategoryService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';

const props = defineProps<{
  /** null = add a new category. */
  category: IProductCategory | null;
}>();

const emit = defineEmits<{ saved: [category: IProductCategory] }>();

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const isSaving = ref(false);
const form = ref({ name: '' });

const isEdit = computed(() => !!props.category);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('productCategories.form.nameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
};

watch(open, (isOpen) => {
  if (!isOpen) return;
  form.value = { name: props.category?.name ?? '' };
  formRef.value?.clearValidate();
});

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  const payload = { name: form.value.name.trim() };
  isSaving.value = true;
  try {
    const saved = props.category
      ? await ProductCategoryService.update(props.category.uuid, payload)
      : await ProductCategoryService.create(payload);
    NotificationService.success(t(isEdit.value ? 'productCategories.updated' : 'productCategories.created'));
    emit('saved', saved);
    open.value = false;
  } catch (error) {
    NotificationService.error(parseError(error, 'productCategories.saveError'));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <AppDialog
    v-model="open"
    :title="$t(isEdit ? 'productCategories.editTitle' : 'productCategories.addTitle')"
    :subtitle="category ? category.name : $t('productCategories.addSubtitle')"
    width="440px"
    :locked="isSaving"
  >
    <template #icon><Tag :size="20" /></template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
      <el-form-item :label="$t('productCategories.form.name')" prop="name">
        <el-input v-model="form.name" maxlength="100" :placeholder="$t('productCategories.form.namePlaceholder')" />
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
