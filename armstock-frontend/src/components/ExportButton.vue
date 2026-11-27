<script setup lang="ts">
import { FileSpreadsheet } from 'lucide-vue-next';

defineProps<{ loading: boolean; disabled?: boolean }>();

defineEmits<{ click: [] }>();
</script>

<template>
  <el-button :loading="loading" :disabled="disabled" @click="$emit('click')">
    <FileSpreadsheet v-if="!loading" :size="16" aria-hidden="true" />
    <span>{{ $t('common.exportExcel') }}</span>
  </el-button>
</template>
