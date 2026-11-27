<script setup lang="ts">
import { nextTick } from 'vue';
import { RECIPE_PERSONS_MAX, type IRecipeOption } from 'armstock-shared';
import { ChefHat, Plus, Trash2, Users } from 'lucide-vue-next';
import SectionHeader from '../SectionHeader.vue';
import type { IStockOutRecipeForm } from '../../interfaces/IStockOutRecipeForm';
import { emptyRecipeRow } from '../../utils/stockOutTotals';

const props = defineProps<{
  /** Active recipes to pick from, plus those the document already has. */
  recipes: IRecipeOption[];
  /** Recipes are for reason Issued only - for any other reason only a short note shows. */
  available: boolean;
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

const isPersonsValid = (persons: number | undefined) => !!persons && persons >= 1;

const setRecipeRef = (key: number, el: unknown) => {
  if (el) recipeRefs.set(key, el as { focus: () => void });
};
</script>

<template>
  <div class="recipes-editor">
    <SectionHeader
      :title="$t('stockOut.recipes.title')"
      :hint="$t(available ? 'stockOut.recipes.hint' : 'stockOut.recipes.issuedOnly')"
      inset
    >
      <template #icon><ChefHat :size="18" /></template>
    </SectionHeader>

    <p v-if="available && !rows.length" class="form-empty">
      <ChefHat :size="16" aria-hidden="true" />
      {{ $t('stockOut.recipes.empty') }}
    </p>

    <!-- No column titles: the section title and the fields' own text say what goes where. -->
    <el-table v-if="available && rows.length" :data="rows" :show-header="false" class="app-table app-table--form" row-key="key">
      <el-table-column :label="$t('stockOut.recipes.recipe')" min-width="220">
        <template #default="{ row }">
          <el-select
            :ref="(el: unknown) => setRecipeRef(row.key, el)"
            v-model="row.recipeUuid"
            filterable
            automatic-dropdown
            :disabled="disabled"
            :placeholder="$t('stockOut.recipes.recipePlaceholder')"
            :no-data-text="$t('stockOut.recipes.noRecipes')"
            :aria-label="$t('stockOut.recipes.recipe')"
            :class="{ 'is-invalid': showErrors && !row.recipeUuid }"
            class="recipes-editor__field"
          >
            <template #prefix><ChefHat :size="15" aria-hidden="true" /></template>
            <el-option v-for="recipe in offeredFor(row as IStockOutRecipeForm)" :key="recipe.uuid" :label="recipe.name" :value="recipe.uuid" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column :label="$t('stockOut.recipes.persons')" width="130">
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
          >
            <template #prefix><Users :size="15" aria-hidden="true" /></template>
          </el-input-number>
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

    <div v-if="available" class="recipes-editor__footer">
      <el-button :disabled="disabled" @click="addRow">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ $t('stockOut.recipes.add') }}</span>
      </el-button>
    </div>
  </div>
</template>

<style scoped>
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
