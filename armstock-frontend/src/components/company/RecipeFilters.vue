<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';
import { RecipeStatus } from 'armstock-shared';
import { Search } from 'lucide-vue-next';
import { SEARCH_DEBOUNCE_MS } from '../../constants/constants';
import { RECIPE_STATUS_TAG } from '../../constants/statusTags';
import type { IRecipeFilters } from '../../interfaces/IRecipeFilters';

const emit = defineEmits<{ change: [filters: IRecipeFilters] }>();

const STATUSES = [RecipeStatus.ACTIVE, RecipeStatus.ARCHIVED];

// Starts on Active - archived recipes are the exception.
const form = reactive({
  search: '',
  status: RecipeStatus.ACTIVE as RecipeStatus | '',
});

const toFilters = (): IRecipeFilters => ({
  search: form.search.trim() || undefined,
  status: form.status || undefined,
});

const emitChange = () => emit('change', toFilters());

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(() => form.search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(emitChange, SEARCH_DEBOUNCE_MS);
});

watch(() => form.status, emitChange);

// The page loads from this first emit, so both start from the same filters.
onMounted(emitChange);
</script>

<template>
  <div class="recipe-filters">
    <el-input
      v-model="form.search"
      :placeholder="$t('recipes.filters.search')"
      :aria-label="$t('recipes.filters.search')"
      clearable
      class="recipe-filters__search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <el-select
      v-model="form.status"
      :placeholder="$t('recipes.filters.status')"
      :aria-label="$t('recipes.filters.status')"
      clearable
      class="recipe-filters__select"
    >
      <el-option v-for="status in STATUSES" :key="status" :label="$t(RECIPE_STATUS_TAG[status].labelKey)" :value="status" />
    </el-select>
  </div>
</template>

<style scoped>
.recipe-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.recipe-filters__search {
  width: 280px;
}

.recipe-filters__select {
  width: 200px;
}

@media (max-width: 576px) {
  .recipe-filters__search,
  .recipe-filters__select {
    width: 100%;
  }
}
</style>
