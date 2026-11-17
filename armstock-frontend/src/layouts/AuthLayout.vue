<script setup lang="ts">
import { ArrowLeftRight, Boxes, Users } from 'lucide-vue-next';
import { BRAND } from 'armstock-shared';
import logoName from 'armstock-assets/brand/logo_name.svg';

const points = [
  { icon: Boxes, key: 'auth.brandingPoint1' },
  { icon: ArrowLeftRight, key: 'auth.brandingPoint2' },
  { icon: Users, key: 'auth.brandingPoint3' },
];
</script>

<template>
  <div class="auth-layout">
    <aside class="branding">
      <div class="brand-chip">
        <img :src="logoName" :alt="BRAND.name" width="150" height="44" />
      </div>

      <div class="branding__content">
        <h2 class="branding__title">{{ $t('auth.brandingTitle') }}</h2>
        <p class="branding__subtitle">{{ $t('auth.brandingSubtitle') }}</p>

        <ul class="branding__points">
          <li v-for="point in points" :key="point.key">
            <span class="branding__point-icon">
              <component :is="point.icon" :size="18" aria-hidden="true" />
            </span>
            {{ $t(point.key) }}
          </li>
        </ul>
      </div>
    </aside>

    <main class="form-panel">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100dvh;
  display: flex;
  background-color: var(--bg-app);
}

.branding {
  width: 42%;
  min-width: 420px;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 48px 56px;
  color: var(--text-inverse);
  background: linear-gradient(160deg, var(--primary-dark) 0%, var(--primary) 100%);
}

.brand-chip {
  align-self: center;
  padding: 10px 16px;
  background-color: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.branding__content {
  margin: auto 0;
}

.branding__title {
  margin: 0 0 1rem;
  font-size: var(--text-4xl);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.branding__subtitle {
  max-width: 400px;
  margin: 0 0 1.5rem;
  font-size: var(--text-base);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}

.branding__points {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-weight: 500;
}

.branding__points li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.branding__point-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background-color: rgba(255, 255, 255, 0.15);
}

.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(circle at 20% 10%, var(--primary-light) 0, transparent 45%),
    radial-gradient(circle at 90% 90%, var(--primary-light) 0, transparent 40%),
    var(--bg-app);
}

@media (max-width: 991.98px) {
  .auth-layout {
    flex-direction: column;
  }

  .branding {
    width: 100%;
    min-width: 0;
    max-width: none;
    gap: 1rem;
    padding: clamp(40px, 12vw, 56px) 20px clamp(48px, 12vw, 64px);
    text-align: center;
  }

  .branding__subtitle,
  .branding__points {
    display: none;
  }

  .branding__title {
    margin: 0;
    font-size: var(--text-xl);
  }

  .form-panel {
    align-items: flex-start;
  }
}
</style>
