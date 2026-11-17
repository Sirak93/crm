<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronDown, LogOut } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { ROUTE_NAME } from '../constants/constants';

const authStore = useAuthStore();
const router = useRouter();

const user = computed(() => authStore.user);

const handleLogout = async () => {
  await authStore.logout();
  router.push({ name: ROUTE_NAME.LOGIN });
};
</script>

<template>
  <el-dropdown v-if="user" trigger="click" placement="bottom-end" @command="handleLogout">
    <button type="button" class="profile-trigger" :aria-label="user.displayName">
      <span class="profile-avatar">{{ user.initials }}</span>
      <ChevronDown :size="16" class="profile-chevron" aria-hidden="true" />
    </button>

    <template #dropdown>
      <div class="profile-header">
        <p class="profile-name">{{ user.displayName }}</p>
        <p v-if="user.fullName" class="profile-email">{{ user.email }}</p>
      </div>
      <el-dropdown-menu>
        <el-dropdown-item command="logout" class="profile-logout">
          <LogOut :size="18" aria-hidden="true" />
          <span>{{ $t('common.logout') }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.profile-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
}

.profile-trigger:hover {
  background-color: var(--bg-app);
}

.profile-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--primary);
  background-color: var(--primary-light);
}

.profile-chevron {
  color: var(--text-muted);
}

.profile-header {
  max-width: 240px;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.profile-name,
.profile-email {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-main);
}

.profile-email {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.profile-logout {
  gap: 0.5rem;
  color: var(--danger);
}
</style>
