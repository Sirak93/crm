/** One row of a dashboard "latest documents" list. */
export interface ILatestDocumentRow {
  uuid: string;
  number: string;
  date: string;
  /** Supplier, or where the goods went. */
  detail: string;
  /** Product count (stock-in) or reason (stock-out). */
  value: string;
}
