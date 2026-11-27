<script setup lang="ts">
import { ChefHat } from 'lucide-vue-next';
</script>

<template>
  <el-tooltip :content="$t('stockOut.byRecipe')" placement="top">
    <span class="recipe-icon" role="img" :aria-label="$t('stockOut.byRecipe')">
      <ChefHat :size="14" aria-hidden="true" />
    </span>
  </el-tooltip>
</template>

<style scoped>
.recipe-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  vertical-align: middle;
  border-radius: 50%;
  color: var(--primary-dark);
  background-color: var(--primary-light);
}
</style>
