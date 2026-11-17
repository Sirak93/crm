import { isAxiosError } from 'axios';
import { useI18n } from 'vue-i18n';

/** The translated message for an API error code (`errors.<CODE>`), or the fallback key's text. */
export const useApiErrorMessage = () => {
  const { t, te } = useI18n();

  const parseError = (error: unknown, fallbackKey: string): string => {
    const code = isAxiosError(error) ? error.response?.data?.error?.code : undefined;
    const key = `errors.${code}`;
    return code && te(key) ? t(key) : t(fallbackKey);
  };

  return { parseError };
};
