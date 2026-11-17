<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="page-header">
    <h1 class="page-header__title">{{ title }}</h1>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.page-header__title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
}
</style>
