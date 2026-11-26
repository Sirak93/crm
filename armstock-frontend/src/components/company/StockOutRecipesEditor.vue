<script setup lang="ts">
import { nextTick } from 'vue';
import { RECIPE_PERSONS_MAX, type IRecipeOption } from 'armstock-shared';
import { Plus, Trash2 } from 'lucide-vue-next';
import RecipeAmounts from './RecipeAmounts.vue';
import type { IStockOutRecipeForm } from '../../interfaces/IStockOutRecipeForm';
import { emptyRecipeRow, neededQuantity } from '../../utils/stockOutTotals';

const props = defineProps<{
  /** Active recipes to pick from. */
  recipes: IRecipeOption[];
  recipeMap: ReadonlyMap<string, IRecipeOption>;
  /** Recipes are for reason Issued only. */
  disabled: boolean;
  /** Highlight rows that are not filled in correctly - set after a failed save. */
  showErrors: boolean;
}>();

const rows = defineModel<IStockOutRecipeForm[]>({ required: true });

const recipeRefs = new Map<number, { focus: () => void }>();

// The first row's persons start empty; a new row copies the row above.
const addRow = async () => {
  const row = emptyRecipeRow(rows.value.at(-1)?.persons);
  rows.value = [...rows.value, row];
  await nextTick();
  recipeRefs.get(row.key)?.focus();
};

const removeRow = (key: number) => {
  rows.value = rows.value.filter((row) => row.key !== key);
  recipeRefs.delete(key);
};

// Each recipe once per document - those on other rows are not offered again.
const offeredFor = (row: IStockOutRecipeForm) => {
  const used = new Set(rows.value.filter((other) => other.key !== row.key).map((other) => other.recipeUuid));
  return props.recipes.filter((recipe) => !used.has(recipe.uuid));
};

const amountsOf = (row: IStockOutRecipeForm) => {
  const recipe = props.recipeMap.get(row.recipeUuid);
  if (!recipe || !row.persons) return [];
  return recipe.lines.map((line) => ({ ...line, neededQuantity: neededQuantity(line.quantity, row.persons!) }));
};

const isPersonsValid = (persons: number | undefined) => !!persons && persons >= 1;

const setRecipeRef = (key: number, el: unknown) => {
  if (el) recipeRefs.set(key, el as { focus: () => void });
};
</script>

<template>
  <div class="recipes-editor">
    <div class="recipes-editor__head">
      <h2 class="recipes-editor__title">{{ $t('stockOut.recipes.title') }}</h2>
      <p class="recipes-editor__hint">{{ $t(disabled ? 'stockOut.recipes.issuedOnly' : 'stockOut.recipes.hint') }}</p>
    </div>

    <el-table v-if="rows.length" :data="rows" class="app-table" row-key="key">
      <el-table-column type="index" label="#" width="48" align="center" />
      <el-table-column :label="$t('stockOut.recipes.recipe')" min-width="220">
        <template #default="{ row }">
          <el-select
            :ref="(el: unknown) => setRecipeRef(row.key, el)"
            v-model="row.recipeUuid"
            filterable
            :disabled="disabled"
            :placeholder="$t('stockOut.recipes.recipePlaceholder')"
            :no-data-text="$t('stockOut.recipes.noRecipes')"
            :aria-label="$t('stockOut.recipes.recipe')"
            :class="{ 'is-invalid': showErrors && !row.recipeUuid }"
            class="recipes-editor__field"
          >
            <el-option v-for="recipe in offeredFor(row as IStockOutRecipeForm)" :key="recipe.uuid" :label="recipe.name" :value="recipe.uuid" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.recipes.persons')" min-width="110">
        <template #default="{ row }">
          <el-input-number
            v-model="row.persons"
            :controls="false"
            :min="1"
            :max="RECIPE_PERSONS_MAX"
            :precision="0"
            :disabled="disabled"
            :aria-label="$t('stockOut.recipes.persons')"
            :class="{ 'is-invalid': showErrors && !isPersonsValid(row.persons) }"
            class="recipes-editor__field recipes-editor__number"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.recipes.amounts')" min-width="280">
        <template #default="{ row }">
          <RecipeAmounts :lines="amountsOf(row as IStockOutRecipeForm)" />
        </template>
      </el-table-column>
      <el-table-column width="56" align="center">
        <template #default="{ row, $index }">
          <button
            type="button"
            class="recipes-editor__remove"
            :disabled="disabled"
            :aria-label="$t('stockOut.recipes.remove', { row: $index + 1 })"
            @click="removeRow((row as IStockOutRecipeForm).key)"
          >
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </template>
      </el-table-column>
    </el-table>

    <div class="recipes-editor__footer">
      <el-button :disabled="disabled" @click="addRow">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ $t('stockOut.recipes.add') }}</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.recipes-editor__head {
  padding: 0.875rem clamp(0.75rem, 2vw, 1.25rem) 0.5rem;
}

.recipes-editor__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.recipes-editor__hint {
  margin: 0.25rem 0 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.recipes-editor__field {
  width: 100%;
}

.recipes-editor__number :deep(.el-input__inner) {
  text-align: right;
}

.recipes-editor :deep(.is-invalid .el-input__wrapper),
.recipes-editor :deep(.is-invalid .el-select__wrapper) {
  border-color: var(--danger) !important;
}

.recipes-editor__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.recipes-editor__remove:hover:not(:disabled) {
  background-color: var(--danger-light);
  color: var(--danger);
}

.recipes-editor__remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.recipes-editor__remove:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.recipes-editor__footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}
</style>
