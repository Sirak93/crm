<script setup lang="ts">
import { PERMISSION_GROUPS, type Permission } from 'armstock-shared';
import { PERMISSION_GROUP_LABEL, PERMISSION_LABEL } from '../../constants/permissionLabels';

defineProps<{ disabled?: boolean }>();

const permissions = defineModel<Permission[]>({ required: true });

const has = (permission: Permission) => permissions.value.includes(permission);

const onCount = (list: readonly Permission[]) => list.filter(has).length;

const setOne = (permission: Permission, isOn: boolean) => {
  const rest = permissions.value.filter((p) => p !== permission);
  permissions.value = isOn ? [...rest, permission] : rest;
};

/** The group switch turns every permission of the group on or off. */
const setGroup = (list: readonly Permission[], isOn: boolean) => {
  const rest = permissions.value.filter((p) => !list.includes(p));
  permissions.value = isOn ? [...rest, ...list] : rest;
};
</script>

<template>
  <div class="permission-panel">
    <section v-for="{ group, permissions: list } in PERMISSION_GROUPS" :key="group" class="permission-group">
      <header class="permission-group__head">
        <span class="permission-group__title">{{ $t(PERMISSION_GROUP_LABEL[group]) }}</span>
        <span class="permission-group__count">{{ $t('permissions.count', { on: onCount(list), total: list.length }) }}</span>
        <el-switch
          :model-value="onCount(list) === list.length"
          :disabled="disabled"
          :aria-label="$t('permissions.groupSwitch', { group: $t(PERMISSION_GROUP_LABEL[group]) })"
          @update:model-value="(isOn) => setGroup(list, !!isOn)"
        />
      </header>
      <ul class="permission-group__list">
        <li v-for="permission in list" :key="permission" class="permission-item">
          <span>{{ $t(PERMISSION_LABEL[permission]) }}</span>
          <el-switch
            size="small"
            :model-value="has(permission)"
            :disabled="disabled"
            :aria-label="$t(PERMISSION_LABEL[permission])"
            @update:model-value="(isOn) => setOne(permission, !!isOn)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.permission-panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 576px) {
  .permission-panel {
    grid-template-columns: 1fr 1fr;
  }
}

.permission-group {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem;
}

.permission-group__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.permission-group__title {
  flex: 1;
  font-weight: 600;
  color: var(--text-dark);
}

.permission-group__count {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.permission-group__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.permission-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--text-main);
}
</style>
