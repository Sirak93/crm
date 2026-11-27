import { QUANTITY_DECIMALS, toAppWallClock } from 'armstock-shared';
import i18n from '../i18n';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

const locale = () => i18n.global.locale.value;

export const formatNumber = (value: number): string => new Intl.NumberFormat(locale()).format(value);

/** Decimals only when there are any, e.g. 100 or 1.25 */
export const formatQuantity = (value: number, decimals = QUANTITY_DECIMALS): string =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits: decimals }).format(value);

/** DD/MM/YYYY, numbers only like formatDateTime. */
export const formatDate = (iso: string): string => formatDateTime(iso).slice(0, 10);

/** DD/MM/YYYY HH:mm (24-hour), numbers only like formatDateTime. */
export const formatDateTimeShort = (iso: string): string => formatDateTime(iso).slice(0, 16);

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: exponent === 0 ? 0 : 1 }).format(value)} ${BYTE_UNITS[exponent]}`;
};

export const pad = (value: number): string => String(value).padStart(2, '0');

/** Numbers only, so no translation can change it: DD/MM/YYYY HH:mm:ss (24-hour), Armenian time. */
export const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  const d = toAppWallClock(new Date(iso));
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};
