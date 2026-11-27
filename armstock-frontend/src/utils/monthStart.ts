import { pad } from './format';

/** The first moment of the current month in the browser's time zone, as an ISO date-time. */
export const monthStartIso = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

/** YYYY-MM-DD in the browser's time zone - the value format of the daterange pickers. */
export const toPickerDay = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The 1st of this month to today, as YYYY-MM-DD for a daterange picker - the default range of the stock lists. */
export const thisMonthRange = (): [string, string] => {
  const now = new Date();
  return [toPickerDay(new Date(now.getFullYear(), now.getMonth(), 1)), toPickerDay(now)];
};

/** A daterange picker's YYYY-MM-DD days as ISO date-times: from the start of the first to the end of the last, browser time zone. */
export const pickerRangeToIso = (range: [string, string] | null): { dateFrom?: string; dateTo?: string } => ({
  dateFrom: range ? new Date(`${range[0]}T00:00:00`).toISOString() : undefined,
  dateTo: range ? new Date(`${range[1]}T23:59:59.999`).toISOString() : undefined,
});
