/** Totals for every product that matches the balance filters, across all pages. */
export interface IStockBalanceSummary {
    totalValue: number;
    /** Products with quantity above 0. */
    productCount: number;
}
