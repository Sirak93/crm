<script setup lang="ts">
defineProps<{
  label: string;
  isUp: boolean;
}>();
</script>

<template>
  <div class="health-status-item">
    <span class="health-status-item__label">{{ label }}</span>
    <el-tag :type="isUp ? 'success' : 'danger'" effect="light" round>
      {{ isUp ? $t('health.ok') : $t('health.down') }}
    </el-tag>
  </div>
</template>

<style scoped>
.health-status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.health-status-item:last-child {
  border-bottom: none;
}

.health-status-item__label {
  font-weight: 600;
  color: var(--text-main);
}
</style>
