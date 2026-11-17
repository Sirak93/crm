<script setup lang="ts">
import type { INavItem } from '../config/navigation';

defineProps<{
  item: INavItem;
}>();

const emit = defineEmits<{ navigate: [] }>();

// The link handles navigation; a plain left click also closes the mobile sidebar.
// Modified clicks (new tab) are left to the browser.
const onClick = (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  emit('navigate');
};
</script>

<template>
  <router-link
    :to="{ name: item.routeName }"
    class="nav-link"
    active-class="nav-link--active"
    @click="onClick"
  >
    <component :is="item.icon" :size="18" aria-hidden="true" />
    <span>{{ $t(item.labelKey) }}</span>
  </router-link>
</template>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
}

.nav-link:hover {
  background-color: var(--bg-app);
  color: var(--text-main);
}

.nav-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.nav-link :deep(svg) {
  flex-shrink: 0;
}

.nav-link--active {
  background: linear-gradient(90deg, var(--primary-light) 0%, transparent 100%);
  color: var(--primary);
  border-left: 3px solid var(--primary);
  border-radius: 0 12px 12px 0;
}
</style>
