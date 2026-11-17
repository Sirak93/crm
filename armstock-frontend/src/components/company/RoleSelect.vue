<script setup lang="ts">
import { COMPANY_ROLES, type UserRole } from 'armstock-shared';
import { ROLE_LABEL_KEY } from '../../constants/roleLabels';

const role = defineModel<UserRole | undefined>({ required: true });
</script>

<template>
  <el-select v-model="role" :placeholder="$t('forms.login.rolePlaceholder')" class="role-select">
    <el-option v-for="option in COMPANY_ROLES" :key="option" :label="$t(ROLE_LABEL_KEY[option])" :value="option" />
  </el-select>
</template>

<style scoped>
.role-select {
  width: 100%;
}
</style>
