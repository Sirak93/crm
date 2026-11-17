<script setup lang="ts">
import PageHeader from '../components/PageHeader.vue';
</script>

<template>
  <section>
    <PageHeader :title="$t('dashboard.title')" />
    <div class="dashboard-card">
      <el-empty :description="$t('dashboard.empty')" />
    </div>
  </section>
</template>

<style scoped>
.dashboard-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
</style>
