/** Totals for every stock-out document that matches the list filters, across all pages. */
export interface IStockOutSummary {
    documentCount: number;
    /** Different products across those documents. */
    productCount: number;
}
