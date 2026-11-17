import { createI18n } from 'vue-i18n';
import en from './locales/en';
import { DEFAULT_LOCALE } from './constants/constants';

const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
  },
});

export default i18n;
