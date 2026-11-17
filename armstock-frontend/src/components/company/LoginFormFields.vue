<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { FormItemRule } from 'element-plus';
import { Lock, Mail } from 'lucide-vue-next';
import { PASSWORD_MIN_LENGTH } from 'armstock-shared';
import type { ILoginForm } from '../../interfaces/ILoginForm';

/** Must be the parent `el-form`'s model, so the `prop` paths match. */
const form = defineModel<ILoginForm>({ required: true });

const { t } = useI18n();

const emailRules: FormItemRule[] = [
  { required: true, whitespace: true, message: () => t('forms.emailRequired'), trigger: 'blur' },
  { type: 'email', message: () => t('forms.emailInvalid'), trigger: 'blur' },
];
const passwordRules: FormItemRule[] = [
  { required: true, message: () => t('forms.login.passwordRequired'), trigger: 'blur' },
  { min: PASSWORD_MIN_LENGTH, message: () => t('forms.login.passwordMin', { count: PASSWORD_MIN_LENGTH }), trigger: 'blur' },
];
</script>

<template>
  <el-form-item :label="$t('forms.email')" prop="email" :rules="emailRules">
    <el-input v-model="form.email" type="email" maxlength="255" autocomplete="off">
      <template #prefix><Mail :size="16" aria-hidden="true" /></template>
    </el-input>
  </el-form-item>

  <el-form-item :label="$t('forms.login.password')" prop="password" :rules="passwordRules">
    <el-input v-model="form.password" type="password" show-password maxlength="72" autocomplete="new-password">
      <template #prefix><Lock :size="16" aria-hidden="true" /></template>
    </el-input>
  </el-form-item>
</template>
