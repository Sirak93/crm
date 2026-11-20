import { isAxiosError } from 'axios';
import { useI18n } from 'vue-i18n';
import { ErrorCodes, type IStockShortage } from 'armstock-shared';
import { formatQuantity } from '../utils/format';

/** The translated message for an API error code (`errors.<CODE>`), or the fallback key's text. */
export const useApiErrorMessage = () => {
  const { t, te } = useI18n();

  /** "Not enough stock: Meat — available 2 kg, ..." built from the products the API sends back. */
  const stockShortageMessage = (shortages: IStockShortage[]): string =>
    t('stockShortage.message', {
      items: shortages
        .map((s) => t('stockShortage.item', { name: s.name, quantity: formatQuantity(s.available), unit: s.unitShortName }))
        .join(', '),
    });

  const parseError = (error: unknown, fallbackKey: string): string => {
    const apiError = isAxiosError(error) ? error.response?.data?.error : undefined;
    const code = apiError?.code;
    if (code === ErrorCodes.STOCK.NOT_ENOUGH.CODE && Array.isArray(apiError?.meta) && apiError.meta.length) {
      return stockShortageMessage(apiError.meta);
    }
    const key = `errors.${code}`;
    return code && te(key) ? t(key) : t(fallbackKey);
  };

  return { parseError };
};
