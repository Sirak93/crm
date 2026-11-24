import type { RecipeStatus } from "../enums/RecipeStatus";

/** A recipe in the list. */
export interface IRecipe {
    uuid: string;
    name: string;
    note: string | null;
    status: RecipeStatus;
    lineCount: number;
    createdAt: string;
}
