<script setup lang="ts">
defineProps<{
  message: string;
}>();

defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="load-error" role="alert">
    <el-alert :title="message" type="error" :closable="false" show-icon />
    <el-button type="primary" @click="$emit('retry')">{{ $t('common.retry') }}</el-button>
  </div>
</template>

<style scoped>
.load-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}
</style>
