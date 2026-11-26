/** Totals for every stock-in document that matches the list filters, across all pages. */
export interface IStockInSummary {
    documentCount: number;
    /** Different products across those documents. */
    productCount: number;
}
