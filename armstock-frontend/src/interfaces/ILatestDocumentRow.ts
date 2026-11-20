/** One row of a dashboard "latest documents" list. */
export interface ILatestDocumentRow {
  uuid: string;
  number: string;
  date: string;
  /** Supplier, or where the goods went. */
  detail: string;
  /** Total money (stock-in) or reason (stock-out). */
  value: string;
}
