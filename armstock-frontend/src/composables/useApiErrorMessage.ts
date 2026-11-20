import { isAxiosError } from 'axios';
import { useI18n } from 'vue-i18n';
import { ErrorCodes, type IStockShortage } from 'armstock-shared';
import { NotificationService } from '../services/NotificationService';
import { formatQuantity } from '../utils/format';

/** The translated message for an API error code (`errors.<CODE>`), or the fallback key's text. */
export const useApiErrorMessage = () => {
  const { t, te } = useI18n();

  const parseError = (error: unknown, fallbackKey: string): string => {
    const code = isAxiosError(error) ? error.response?.data?.error?.code : undefined;
    const key = `errors.${code}`;
    return code && te(key) ? t(key) : t(fallbackKey);
  };

  /** "Not enough stock" may list many products, so it opens a popup; every other error is a toast. */
  const showError = (error: unknown, fallbackKey: string): void => {
    const apiError = isAxiosError(error) ? error.response?.data?.error : undefined;
    const shortages: unknown = apiError?.meta;
    if (apiError?.code === ErrorCodes.STOCK.NOT_ENOUGH.CODE && Array.isArray(shortages) && shortages.length) {
      NotificationService.alertList(
        t('stockShortage.title'),
        t('stockShortage.text'),
        (shortages as IStockShortage[]).map((s) => ({
          label: s.name,
          value: t('stockShortage.available', { quantity: formatQuantity(s.available), unit: s.unitShortName }),
        })),
      );
      return;
    }
    NotificationService.error(parseError(error, fallbackKey));
  };

  return { parseError, showError };
};
