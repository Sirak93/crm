<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { FormItemRule } from 'element-plus';
import { Building2, FileText, Mail, MapPin, Phone } from 'lucide-vue-next';
import type { ICompanyForm } from '../../interfaces/ICompanyForm';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';

/** Must be the parent `el-form`'s model, so the `prop` paths match. */
const form = defineModel<ICompanyForm>({ required: true });

const { t } = useI18n();

const nameRules: FormItemRule[] = [
  { required: true, whitespace: true, message: () => t('forms.company.nameRequired'), trigger: REQUIRED_RULE_TRIGGER },
];
const emailRules: FormItemRule[] = [
  { type: 'email', message: () => t('forms.emailInvalid'), trigger: 'blur' },
];
</script>

<template>
  <el-form-item :label="$t('forms.company.name')" prop="name" :rules="nameRules">
    <el-input v-model="form.name" maxlength="255">
      <template #prefix><Building2 :size="16" aria-hidden="true" /></template>
    </el-input>
  </el-form-item>

  <div class="form-row">
    <el-form-item :label="$t('forms.company.taxId')" prop="taxId">
      <el-input v-model="form.taxId" maxlength="50">
        <template #prefix><FileText :size="16" aria-hidden="true" /></template>
      </el-input>
    </el-form-item>
    <el-form-item :label="$t('forms.company.phone')" prop="phone">
      <el-input v-model="form.phone" type="tel" maxlength="50">
        <template #prefix><Phone :size="16" aria-hidden="true" /></template>
      </el-input>
    </el-form-item>
  </div>

  <el-form-item :label="$t('forms.email')" prop="email" :rules="emailRules">
    <el-input v-model="form.email" type="email" maxlength="255">
      <template #prefix><Mail :size="16" aria-hidden="true" /></template>
    </el-input>
  </el-form-item>

  <el-form-item :label="$t('forms.company.address')" prop="address">
    <el-input v-model="form.address" maxlength="500">
      <template #prefix><MapPin :size="16" aria-hidden="true" /></template>
    </el-input>
  </el-form-item>
</template>
