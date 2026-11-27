export interface IStockMovementFilters {
  search?: string;
  categoryUuid?: string;
  /** ISO date-times, whole days in Armenian time; empty = no limit on that end. */
  dateFrom?: string;
  dateTo?: string;
  withoutMovement: boolean;
}
