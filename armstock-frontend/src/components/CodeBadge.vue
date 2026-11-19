<script setup lang="ts">
defineProps<{
  code: string;
}>();
</script>

<template>
  <span class="code-badge">{{ code }}</span>
</template>

<style scoped>
.code-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 20px;
  padding: 0 6px;
  border: 1px solid var(--border-dark);
  border-radius: 6px;
  background-color: var(--bg-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
