/** One product of a stock-out - each product once. */
export interface IStockOutLinePayload {
    productUuid: string;
    /** The total really given out, ≥ 0 - stock goes down by it. */
    quantity: number;
    /** Part typed in the extras block (no recipe), ≥ 0 - 0 if none. */
    extraQuantity: number;
}
