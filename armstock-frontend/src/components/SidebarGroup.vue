<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronDown } from 'lucide-vue-next';
import SidebarItem from './SidebarItem.vue';
import type { INavGroup } from '../interfaces/INavGroup';

const props = defineProps<{
  group: INavGroup;
}>();

const emit = defineEmits<{ navigate: [] }>();

const route = useRoute();
const router = useRouter();

const listId = computed(() => `nav-group-${props.group.id}`);

const hasActiveChild = computed(() =>
  props.group.children.some((child) => route.path.startsWith(router.resolve({ name: child.routeName }).path)),
);

// Opens by itself when one of its pages is shown; the user can still close it.
const isOpen = ref(hasActiveChild.value);
watch(hasActiveChild, (active) => {
  if (active) isOpen.value = true;
});
</script>

<template>
  <div class="nav-group">
    <button
      type="button"
      class="nav-group__toggle"
      :class="{ 'nav-group__toggle--active': hasActiveChild }"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      @click="isOpen = !isOpen"
    >
      <component :is="group.icon" :size="18" aria-hidden="true" />
      <span class="nav-group__label">{{ $t(group.labelKey) }}</span>
      <ChevronDown :size="16" aria-hidden="true" class="nav-group__chevron" :class="{ 'nav-group__chevron--open': isOpen }" />
    </button>

    <div v-show="isOpen" :id="listId" class="nav-group__children">
      <SidebarItem v-for="child in group.children" :key="child.id" :item="child" @navigate="emit('navigate')" />
    </div>
  </div>
</template>

<style scoped>
.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-group__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
}

.nav-group__toggle:hover {
  background-color: var(--bg-app);
  color: var(--text-main);
}

.nav-group__toggle:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.nav-group__toggle--active {
  color: var(--text-main);
}

.nav-group__toggle :deep(svg) {
  flex-shrink: 0;
}

.nav-group__label {
  flex-grow: 1;
}

.nav-group__chevron {
  transition: transform 0.2s ease;
}

.nav-group__chevron--open {
  transform: rotate(180deg);
}

.nav-group__children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .nav-group__chevron {
    transition: none;
  }
}
</style>
