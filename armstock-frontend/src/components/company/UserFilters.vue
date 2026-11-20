<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { UserStatus, type INamedRef } from 'armstock-shared';
import { Search } from 'lucide-vue-next';
import { SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { USER_STATUS_TAG } from '../../constants/statusTags';
import type { IUserFilters } from '../../interfaces/IUserFilters';

defineProps<{ roles: INamedRef[] }>();

const emit = defineEmits<{ change: [filters: IUserFilters] }>();

const STATUSES = [UserStatus.ACTIVE, UserStatus.BLOCKED, UserStatus.ARCHIVED];

// Starts empty - the list shows everyone, archived users last.
const form = reactive({
  search: '',
  status: '' as UserStatus | '',
  roleUuid: '',
});

const toFilters = (): IUserFilters => ({
  search: form.search.trim() || undefined,
  status: form.status || undefined,
  roleUuid: form.roleUuid || undefined,
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => form.search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => [form.status, form.roleUuid], emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="user-filters">
    <el-input
      v-model="form.search"
      :placeholder="$t('companyUsers.filters.search')"
      :aria-label="$t('companyUsers.filters.search')"
      clearable
      class="user-filters__search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select
      v-model="form.status"
      :placeholder="$t('companyUsers.filters.status')"
      :aria-label="$t('companyUsers.filters.status')"
      clearable
      class="user-filters__select"
    >
      <el-option v-for="status in STATUSES" :key="status" :label="$t(USER_STATUS_TAG[status].labelKey)" :value="status" />
    </el-select>

    <el-select
      v-model="form.roleUuid"
      :placeholder="$t('companyUsers.filters.role')"
      :aria-label="$t('companyUsers.filters.role')"
      clearable
      class="user-filters__select"
    >
      <el-option v-for="role in roles" :key="role.uuid" :label="role.name" :value="role.uuid" />
    </el-select>
  </div>
</template>

<style scoped>
.user-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.user-filters__search {
  width: 280px;
}

.user-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .user-filters__search,
  .user-filters__select {
    width: 100%;
  }
}
</style>
