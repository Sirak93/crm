import { createI18n } from 'vue-i18n';
import en from './locales/en';
import hy from './locales/hy';
import { DEFAULT_LOCALE, FALLBACK_LOCALE, LOCALE, LOCALE_STORAGE_KEY, type Locale } from './constants/constants';

const LOCALES: readonly string[] = Object.values(LOCALE);

const isLocale = (value: string | null): value is Locale => value !== null && LOCALES.includes(value);

const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);

const i18n = createI18n({
  legacy: false,
  locale: isLocale(savedLocale) ? savedLocale : DEFAULT_LOCALE,
  fallbackLocale: FALLBACK_LOCALE,
  messages: {
    hy,
    en,
  },
});

document.documentElement.lang = i18n.global.locale.value;

export const setLocale = (locale: Locale): void => {
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};

export default i18n;
