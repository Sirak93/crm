import { fromAppWallClock, toAppWallClock } from 'armstock-shared';
import { pad } from './format';

/**
 * Element Plus pickers read and set a Date's browser-local fields, so they get a Date whose
 * local fields hold the Armenian time - same numbers in any browser time zone.
 */
export const toPickerDate = (date: Date): Date => {
  const wall = toAppWallClock(date);
  return new Date(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds());
};

/** Back from a picker's Date to the real moment. */
export const fromPickerDate = (date: Date): Date =>
  fromAppWallClock(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds())));

/** Now in Armenian time, as a picker Date. */
export const appNow = (): Date => toPickerDate(new Date());

/** For date pickers: greys out every day after today in Armenia. */
export const isFutureDay = (date: Date): boolean => {
  const now = appNow();
  return date > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
};

/** The first moment of the current month in Armenia, as an ISO date-time. */
export const monthStartIso = (): string => {
  const now = appNow();
  return fromPickerDate(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString();
};

/** YYYY-MM-DD of a picker Date - the value format of the daterange pickers. */
export const toPickerDay = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The 1st of this month to today, as YYYY-MM-DD for a daterange picker - the default range of the stock lists. */
export const thisMonthRange = (): [string, string] => {
  const now = appNow();
  return [toPickerDay(new Date(now.getFullYear(), now.getMonth(), 1)), toPickerDay(now)];
};

/** A daterange picker's YYYY-MM-DD days as ISO date-times: from the start of the first to the end of the last, in Armenia. */
export const pickerRangeToIso = (range: [string, string] | null): { dateFrom?: string; dateTo?: string } => ({
  dateFrom: range ? fromAppWallClock(new Date(`${range[0]}T00:00:00.000Z`)).toISOString() : undefined,
  dateTo: range ? fromAppWallClock(new Date(`${range[1]}T23:59:59.999Z`)).toISOString() : undefined,
});
