import { QUANTITY_DECIMALS } from 'armstock-shared';
import i18n from '../i18n';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

const locale = () => i18n.global.locale.value;

export const formatNumber = (value: number): string => new Intl.NumberFormat(locale()).format(value);

/** Decimals only when there are any, e.g. 100 or 1.25 */
export const formatQuantity = (value: number): string =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits: QUANTITY_DECIMALS }).format(value);

/** For date pickers: greys out every day after today. */
export const isFutureDay = (date: Date): boolean => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date > endOfToday;
};

/** DD/MM/YYYY HH:mm (24-hour), numbers only like formatDateTime. */
export const formatDateTimeShort = (iso: string): string => formatDateTime(iso).slice(0, 16);

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: exponent === 0 ? 0 : 1 }).format(value)} ${BYTE_UNITS[exponent]}`;
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** Numbers only, so no translation can change it: DD/MM/YYYY HH:mm:ss (24-hour). */
export const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
