<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
  /** Small pill next to the title (a count, a name). */
  badge?: string;
}>();
</script>

<template>
  <div class="page-header">
    <div>
      <div class="page-header__title-row">
        <h1 class="page-header__title">{{ title }}</h1>
        <span v-if="badge" class="page-header__badge">{{ badge }}</span>
      </div>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 1rem;
}

.page-header__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.page-header__title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-main);
}

.page-header__badge {
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid var(--border-dark);
  border-radius: 999px;
  background-color: var(--bg-muted);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-muted);
}

.page-header__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.page-header__actions {
  display: flex;
  gap: 0.5rem;
}

/* The gap spaces the buttons; Element Plus would add its own margin on top. */
.page-header__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
