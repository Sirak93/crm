/** A recipe row of a stock-out: the recipe and how many persons it is made for. */
export interface IStockOutRecipePayload {
    recipeUuid: string;
    /** Whole number > 0. */
    persons: number;
}
