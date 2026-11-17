<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { FormItemRule } from 'element-plus';
import { Briefcase, User } from 'lucide-vue-next';
import type { IStaffForm } from '../../interfaces/IStaffForm';

/** Must be the parent `el-form`'s model, so the `prop` paths match. */
const form = defineModel<IStaffForm>({ required: true });

const { t } = useI18n();

const firstNameRules: FormItemRule[] = [
  { required: true, whitespace: true, message: () => t('forms.staff.firstNameRequired'), trigger: 'blur' },
];
const lastNameRules: FormItemRule[] = [
  { required: true, whitespace: true, message: () => t('forms.staff.lastNameRequired'), trigger: 'blur' },
];
</script>

<template>
  <div class="form-row">
    <el-form-item :label="$t('forms.staff.firstName')" prop="firstName" :rules="firstNameRules">
      <el-input v-model="form.firstName" maxlength="100" autocomplete="off">
        <template #prefix><User :size="16" aria-hidden="true" /></template>
      </el-input>
    </el-form-item>
    <el-form-item :label="$t('forms.staff.lastName')" prop="lastName" :rules="lastNameRules">
      <el-input v-model="form.lastName" maxlength="100" autocomplete="off">
        <template #prefix><User :size="16" aria-hidden="true" /></template>
      </el-input>
    </el-form-item>
  </div>

  <el-form-item :label="$t('forms.staff.position')" prop="position">
    <el-input v-model="form.position" maxlength="100" :placeholder="$t('forms.staff.positionPlaceholder')">
      <template #prefix><Briefcase :size="16" aria-hidden="true" /></template>
    </el-input>
  </el-form-item>
</template>
