import type { IRecipe } from "./IRecipe";
import type { IRecipeLine } from "./IRecipeLine";

/** A recipe with its lines, in the order they were typed. */
export interface IRecipeDetails extends IRecipe {
    lines: IRecipeLine[];
}
