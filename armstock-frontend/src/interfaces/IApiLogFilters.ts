export interface IApiLogFilters {
  method?: string;
  path?: string;
  ip?: string;
  slow?: boolean;
  success?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
