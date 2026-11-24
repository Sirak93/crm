import type { IRecipeLinePayload } from "./IRecipeLinePayload";

export interface IRecipePayload {
    name: string;
    note: string | null;
    lines: IRecipeLinePayload[];
}
