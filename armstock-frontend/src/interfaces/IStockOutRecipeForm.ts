/** One editable recipe row of a stock-out form. */
export interface IStockOutRecipeForm {
  /** Stable v-for key - a new row has no uuid yet. */
  key: number;
  recipeUuid: string;
  persons: number | undefined;
}
