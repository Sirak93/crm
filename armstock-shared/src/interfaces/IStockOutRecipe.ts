import type { INamedRef } from "./INamedRef";
import type { IStockOutRecipeLine } from "./IStockOutRecipeLine";

/** A recipe row of a stock-out, with its saved copy of the recipe lines. */
export interface IStockOutRecipe {
    uuid: string;
    recipe: INamedRef;
    persons: number;
    lines: IStockOutRecipeLine[];
}
