<script setup lang="ts">
import { computed, ref } from 'vue';
import { BRAND } from 'armstock-shared';
import logoName from 'armstock-assets/brand/logo_name.svg';
import AppHeader from '../components/AppHeader.vue';
import SidebarItem from '../components/SidebarItem.vue';
import SidebarGroup from '../components/SidebarGroup.vue';
import { isNavGroup, NAV_ITEMS } from '../config/navigation';
import type { INavGroup } from '../interfaces/INavGroup';
import type { INavItem } from '../interfaces/INavItem';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const isSidebarOpen = ref(false);

// A group shows only the links the role may open, and is hidden when none are left.
const navItems = computed(() => {
  const role = authStore.user?.role;
  if (!role) return [];
  return NAV_ITEMS.flatMap((entry): (INavItem | INavGroup)[] => {
    if (!isNavGroup(entry)) return entry.roles.includes(role) ? [entry] : [];
    const children = entry.children.filter((child) => child.roles.includes(role));
    return children.length ? [{ ...entry, children }] : [];
  });
});

const closeSidebar = () => {
  isSidebarOpen.value = false;
};
</script>

<template>
  <div class="app-container">
    <div v-if="isSidebarOpen" class="sidebar-overlay" @click="closeSidebar"></div>

    <aside class="sidebar" :class="{ 'sidebar--open': isSidebarOpen }">
      <router-link to="/" class="sidebar__logo">
        <img :src="logoName" :alt="BRAND.name" width="150" height="44" />
      </router-link>

      <nav class="sidebar__nav" :aria-label="$t('nav.menu')">
        <p class="sidebar__label">{{ $t('nav.menu') }}</p>
        <template v-for="entry in navItems" :key="entry.id">
          <SidebarGroup v-if="isNavGroup(entry)" :group="entry" @navigate="closeSidebar" />
          <SidebarItem v-else :item="entry" @navigate="closeSidebar" />
        </template>
      </nav>
    </aside>

    <div class="main-container">
      <AppHeader @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

      <main class="app-main" :class="{ 'app-main--compact': authStore.user?.isPlatformOwner }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100dvh;
  background-color: var(--bg-app);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 95;
  background-color: rgba(0, 0, 0, 0.3);
}

.sidebar {
  position: fixed;
  z-index: 100;
  width: var(--sidebar-width);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
}

.sidebar__logo {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0 0.25rem;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-grow: 1;
  overflow-y: auto;
}

.sidebar__label {
  margin: 0 0 0.25rem;
  padding: 0 0.75rem;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.main-container {
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-main {
  flex-grow: 1;
  margin-top: var(--header-height);
  padding: clamp(0.5rem, 2vw, 1.5rem);
}

/* Platform Owner pages are data-heavy: tighter padding, more room for tables. */
.app-main--compact {
  padding: 0.5rem;
}

@media (min-width: 576px) {
  .app-main--compact {
    padding: 1rem;
  }
}

@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .sidebar--open {
    transform: translateX(0);
  }

  .main-container {
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
}
</style>
