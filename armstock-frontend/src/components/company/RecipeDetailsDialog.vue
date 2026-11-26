<script setup lang="ts">
import { ref, watch } from 'vue';
import type { IRecipeDetails } from 'armstock-shared';
import { ChefHat, Pencil } from 'lucide-vue-next';
import AppDialog from '../AppDialog.vue';
import LoadError from '../LoadError.vue';
import CodeBadge from '../CodeBadge.vue';
import { RecipeService } from '../../services/RecipeService';
import { RECIPE_STATUS_TAG } from '../../constants/statusTags';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useMeasureUnits } from '../../composables/useMeasureUnits';

const props = defineProps<{
  /** The recipe to show; loaded each time the popup opens. */
  uuid: string | null;
  canEdit: boolean;
}>();

const emit = defineEmits<{ edit: [uuid: string] }>();

const open = defineModel<boolean>({ required: true });

const { formatRecipeAmount } = useMeasureUnits();

const recipe = ref<IRecipeDetails | null>(null);

const isLoading = ref(false);
const hasError = ref(false);

const load = async () => {
  if (!props.uuid) return;
  isLoading.value = true;
  hasError.value = false;
  recipe.value = null;
  try {
    recipe.value = await RecipeService.get(props.uuid);
  } catch (error) {
    AppLogger.error('Failed to load the recipe:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

watch(open, (isOpen) => {
  if (isOpen) load();
});
</script>

<template>
  <AppDialog
    v-model="open"
    :title="recipe?.name ?? $t('recipes.details.title')"
    :subtitle="$t('recipes.details.subtitle')"
    width="680px"
  >
    <template #icon><ChefHat :size="20" /></template>

    <LoadError v-if="hasError && !isLoading" :message="$t('recipes.loadOneError')" @retry="load" />

    <el-skeleton v-else-if="isLoading || !recipe" :rows="5" animated />

    <div v-else class="recipe-details">
      <div class="recipe-details__meta">
        <el-tag size="small" :type="RECIPE_STATUS_TAG[recipe.status].type" round>
          {{ $t(RECIPE_STATUS_TAG[recipe.status].labelKey) }}
        </el-tag>
        <span class="recipe-details__count">{{ $t('recipes.details.productCount', { count: formatNumber(recipe.lineCount) }) }}</span>
      </div>

      <p v-if="recipe.note" class="recipe-details__note">{{ recipe.note }}</p>

      <!-- Long recipes scroll inside the popup. -->
      <el-table :data="recipe.lines" class="app-table recipe-details__lines" max-height="420" row-key="uuid">
        <el-table-column type="index" label="#" width="48" align="center" />
        <el-table-column :label="$t('recipes.lines.product')" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-text">{{ row.product.name }}</span>
            <CodeBadge v-if="row.product.code" :code="row.product.code" class="recipe-details__code" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('recipes.lines.perPerson')" min-width="130" align="right">
          <template #default="{ row }">
            <span class="cell-text">{{ formatRecipeAmount(row.quantity, row.product.measureUnit) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="open = false">{{ $t('common.close') }}</el-button>
      <el-button v-if="canEdit && recipe" type="primary" @click="emit('edit', recipe.uuid)">
        <Pencil :size="16" aria-hidden="true" />
        <span>{{ $t('recipes.actions.edit') }}</span>
      </el-button>
    </template>
  </AppDialog>
</template>

<style scoped>
.recipe-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recipe-details__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.recipe-details__count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.recipe-details__note {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-main);
  white-space: pre-line;
}

.recipe-details__code {
  margin-left: 0.5rem;
}

.recipe-details__lines {
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
