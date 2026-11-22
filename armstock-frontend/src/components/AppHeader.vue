<script setup lang="ts">
import { Menu } from 'lucide-vue-next';
import { BRAND } from 'armstock-shared';
import logoIcon from 'armstock-assets/brand/logo-animated.svg';
import LanguageSwitcher from './LanguageSwitcher.vue';
import ProfileDropdown from './ProfileDropdown.vue';
import ScannerConnectButton from './ScannerConnectButton.vue';

defineEmits<{ 'toggle-sidebar': [] }>();
</script>

<template>
  <header class="app-header">
    <div class="app-header__start">
      <button
        type="button"
        class="app-header__menu-btn"
        :aria-label="$t('nav.openMenu')"
        @click="$emit('toggle-sidebar')"
      >
        <Menu :size="20" aria-hidden="true" />
      </button>
      <router-link to="/" class="app-header__mobile-logo">
        <img :src="logoIcon" :alt="BRAND.name" height="34" />
      </router-link>
    </div>

    <div class="app-header__end">
      <ScannerConnectButton />
      <LanguageSwitcher />
      <ProfileDropdown />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  right: 0;
  left: var(--sidebar-width);
  z-index: 110;
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(0.5rem, 2vw, 1.5rem);
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}

.app-header__start {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-header__end {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-header__menu-btn,
.app-header__mobile-logo {
  display: none;
}

.app-header__menu-btn {
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.app-header__menu-btn:hover {
  background-color: var(--bg-muted);
  color: var(--primary);
}

.app-header__menu-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .app-header {
    left: 0;
  }

  .app-header__menu-btn,
  .app-header__mobile-logo {
    display: flex;
  }
}
</style>
