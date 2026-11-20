<script setup lang="ts">
import type { INamedRef } from 'armstock-shared';

defineProps<{
  /** The company's roles. */
  options: INamedRef[];
  disabled?: boolean;
}>();

const roleUuid = defineModel<string>({ required: true });
</script>

<template>
  <el-select v-model="roleUuid" :disabled="disabled" :placeholder="$t('forms.user.rolePlaceholder')" class="role-select">
    <el-option v-for="option in options" :key="option.uuid" :label="option.name" :value="option.uuid" />
  </el-select>
</template>

<style scoped>
.role-select {
  width: 100%;
}
</style>
