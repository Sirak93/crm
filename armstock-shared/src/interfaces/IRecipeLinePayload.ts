export interface IRecipeLinePayload {
    productUuid: string;
    /** Per 1 person, in the product's own unit; up to 3 decimals for every unit. */
    quantity: number;
}
