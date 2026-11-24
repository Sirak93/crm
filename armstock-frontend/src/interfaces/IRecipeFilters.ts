import type { RecipeStatus } from 'armstock-shared';

export interface IRecipeFilters {
  search?: string;
  status?: RecipeStatus;
}
