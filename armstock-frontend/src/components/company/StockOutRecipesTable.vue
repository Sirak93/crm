<script setup lang="ts">
import type { IStockOutRecipe } from 'armstock-shared';
import RecipeAmounts from './RecipeAmounts.vue';
import { formatNumber } from '../../utils/format';

/** A saved document's recipe rows - the amounts are its saved copy, not the current recipe. */
defineProps<{
  recipes: IStockOutRecipe[];
}>();
</script>

<template>
  <el-table :data="recipes" class="app-table" row-key="uuid">
    <el-table-column type="index" label="#" width="48" align="center" />
    <el-table-column :label="$t('stockOut.recipes.recipe')" min-width="200">
      <template #default="{ row }"><span class="cell-text cell-text--strong">{{ row.recipe.name }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.recipes.persons')" min-width="90" align="right">
      <template #default="{ row }"><span class="cell-text">{{ formatNumber(row.persons) }}</span></template>
    </el-table-column>
    <el-table-column :label="$t('stockOut.recipes.amounts')" min-width="300">
      <template #default="{ row }"><RecipeAmounts :lines="(row as IStockOutRecipe).lines" /></template>
    </el-table-column>
  </el-table>
</template>
