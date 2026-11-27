/** A recipe of a by-recipe stock-out that used the product - from the copy saved that day. */
export interface IStockMovementRecipe {
    name: string;
    persons: number;
    /** Per-person amount × persons, in the product's own unit. */
    quantity: number;
}
