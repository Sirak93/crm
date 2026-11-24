<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Permission, type IPaginationMeta, type IRecipe } from 'armstock-shared';
import { ChefHat, Plus } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import RecipeFilters from '../../components/company/RecipeFilters.vue';
import RecipesTable from '../../components/company/RecipesTable.vue';
import RecipeDetailsDialog from '../../components/company/RecipeDetailsDialog.vue';
import { RecipeService } from '../../services/RecipeService';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE, ROUTE_NAME } from '../../constants/constants';
import type { IRecipeFilters } from '../../interfaces/IRecipeFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const router = useRouter();
const authStore = useAuthStore();

const recipes = ref<IRecipe[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<IRecipeFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);

const isDetailsOpen = ref(false);
const detailsUuid = ref<string | null>(null);

const hasFilters = computed(() => !!filters.value.search);
const canAdd = computed(() => !!authStore.user?.can(Permission.RECIPE_ADD));
const canEdit = computed(() => !!authStore.user?.can(Permission.RECIPE_EDIT));

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await RecipeService.list(page, meta.value.pageSize, filters.value);
    recipes.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load recipes:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const onFiltersChange = (newFilters: IRecipeFilters) => {
  filters.value = newFilters;
  load(1);
};

const openDetails = (recipe: IRecipe) => {
  detailsUuid.value = recipe.uuid;
  isDetailsOpen.value = true;
};

const openEdit = (uuid: string) => router.push({ name: ROUTE_NAME.COMPANY_RECIPE_EDIT, params: { uuid } });
</script>

<template>
  <section class="recipes-page">
    <PageHeader
      :title="$t('recipes.title')"
      :subtitle="$t('recipes.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template v-if="canAdd" #actions>
        <el-button type="primary" @click="router.push({ name: ROUTE_NAME.COMPANY_RECIPE_NEW })">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('recipes.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <RecipeFilters @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('recipes.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!recipes.length" :description="$t(hasFilters ? 'recipes.noResults' : 'recipes.empty')">
        <template #image><ChefHat :size="40" aria-hidden="true" /></template>
      </el-empty>

      <RecipesTable
        v-else
        v-loading="isLoading"
        :recipes="recipes"
        :can-edit="canEdit"
        @view="openDetails"
        @edit="(recipe) => openEdit(recipe.uuid)"
      />
    </AppCard>

    <el-pagination
      v-if="meta.totalPages > 1"
      class="recipes-pagination"
      size="small"
      layout="prev, pager, next"
      :total="meta.total"
      :current-page="meta.page"
      :page-size="meta.pageSize"
      @current-change="load"
    />

    <RecipeDetailsDialog v-model="isDetailsOpen" :uuid="detailsUuid" :can-edit="canEdit" @edit="openEdit" />
  </section>
</template>

<style scoped>
.recipes-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recipes-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}

.recipes-pagination {
  justify-content: flex-end;
}
</style>
