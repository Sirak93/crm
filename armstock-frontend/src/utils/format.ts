import i18n from '../i18n';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

const locale = () => i18n.global.locale.value;

export const formatNumber = (value: number): string => new Intl.NumberFormat(locale()).format(value);

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
