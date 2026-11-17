<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { BRAND, type IHealthStatus } from 'armstock-shared';
import logoUrl from 'armstock-assets/brand/logo_name.svg';
import HealthStatusItem from '../components/HealthStatusItem.vue';
import { HealthService } from '../services/HealthService';
import { AppLogger } from '../utils/AppLogger';

const status = ref<IHealthStatus | null>(null);
const isLoading = ref(false);
const hasError = ref(false);

const loadStatus = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    status.value = await HealthService.getStatus();
  } catch (error) {
    AppLogger.error('Health check failed:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadStatus);
</script>

<template>
  <main class="start-page">
    <img :src="logoUrl" :alt="BRAND.name" class="start-page__logo" />

    <section class="start-page__card" aria-live="polite">
      <h1 class="start-page__title">{{ $t('health.title') }}</h1>

      <el-skeleton v-if="isLoading" :rows="2" animated />

      <div v-else-if="hasError" class="start-page__error">
        <el-alert :title="$t('health.loadError')" type="error" :closable="false" show-icon />
        <el-button type="primary" @click="loadStatus">{{ $t('health.retry') }}</el-button>
      </div>

      <template v-else-if="status">
        <HealthStatusItem :label="$t('health.database')" :is-up="status.database" />
        <HealthStatusItem :label="$t('health.redis')" :is-up="status.redis" />
      </template>
    </section>
  </main>
</template>

<style scoped>
.start-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1rem;
}

.start-page__logo {
  width: clamp(200px, 40vw, 320px);
  height: auto;
}

.start-page__card {
  width: 100%;
  max-width: 420px;
  padding: 1.5rem;
  background-color: var(--bg-card);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.start-page__title {
  margin: 0 0 1rem;
  font-size: var(--text-xl);
  font-weight: 800;
  color: var(--text-main);
}

.start-page__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}
</style>
