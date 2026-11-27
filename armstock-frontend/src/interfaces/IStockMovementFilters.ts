export interface IStockMovementFilters {
  search?: string;
  categoryUuid?: string;
  /** ISO date-times, whole days in the browser's time zone; empty = no limit on that end. */
  dateFrom?: string;
  dateTo?: string;
  withoutMovement: boolean;
}
