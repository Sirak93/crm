import type { IRecipeLine } from "./IRecipeLine";

/** An active recipe offered in the stock-out form, with the lines its amounts are worked out from. */
export interface IRecipeOption {
    uuid: string;
    name: string;
    lines: IRecipeLine[];
}
