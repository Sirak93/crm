import { isAxiosError } from 'axios';
import { useI18n } from 'vue-i18n';
import { ErrorCodes, type IStockShortage, type ISupplierReturnError } from 'armstock-shared';
import { NotificationService } from '../services/NotificationService';
import { formatQuantity } from '../utils/format';

/** "Not enough stock" texts: a stock-out takes too much; a stock-in edit/delete takes back goods that already went out. */
export const STOCK_SHORTAGE_TEXT = {
  STOCK_OUT: { text: 'stockShortage.text', value: 'stockShortage.available' },
  STOCK_IN: { text: 'stockShortage.stockInText', value: 'stockShortage.inStock' },
} as const;

type StockShortageText = typeof STOCK_SHORTAGE_TEXT[keyof typeof STOCK_SHORTAGE_TEXT];

/** The translated message for an API error code (`errors.<CODE>`), or the fallback key's text. */
export const useApiErrorMessage = () => {
  const { t, te } = useI18n();

  const parseError = (error: unknown, fallbackKey: string): string => {
    const code = isAxiosError(error) ? error.response?.data?.error?.code : undefined;
    const key = `errors.${code}`;
    return code && te(key) ? t(key) : t(fallbackKey);
  };

  /** A popup for each error that lists products; returns false when its `meta` is missing. */
  const POPUPS: Record<string, (meta: unknown, shortageText: StockShortageText) => boolean> = {
    [ErrorCodes.STOCK.NOT_ENOUGH.CODE]: (meta, shortageText) => {
      if (!Array.isArray(meta) || !meta.length) return false;
      NotificationService.alertList(
        t('stockShortage.title'),
        t(shortageText.text),
        (meta as IStockShortage[]).map((s) => ({
          label: s.name,
          value: t(shortageText.value, { quantity: formatQuantity(s.available), unit: s.unitShortName }),
        })),
      );
      return true;
    },
    [ErrorCodes.STOCK_OUT.RETURN_EXCEEDS_SUPPLIER.CODE]: (meta) => supplierReturnPopup(meta, 'exceedsTitle', 'exceedsText', 'canReturn'),
    [ErrorCodes.STOCK_IN.BELOW_RETURNED.CODE]: (meta) => supplierReturnPopup(meta, 'belowReturnedTitle', 'belowReturnedText', 'returned'),
  };

  const supplierReturnPopup = (meta: unknown, titleKey: string, textKey: string, valueKey: string): boolean => {
    const data = meta as ISupplierReturnError | undefined;
    if (!data?.products?.length) return false;
    NotificationService.alertList(
      t(`supplierReturn.${titleKey}`, { supplier: data.supplierName }),
      t(`supplierReturn.${textKey}`),
      data.products.map((p) => ({
        label: p.name,
        value: t(`supplierReturn.${valueKey}`, { quantity: formatQuantity(p.quantity), unit: p.unitShortName }),
      })),
    );
    return true;
  };

  /** Errors that list products open a popup (too long for a toast); every other error is a toast. */
  const showError = (error: unknown, fallbackKey: string, shortageText: StockShortageText = STOCK_SHORTAGE_TEXT.STOCK_OUT): void => {
    const apiError = isAxiosError(error) ? error.response?.data?.error : undefined;
    const popup = apiError?.code ? POPUPS[apiError.code] : undefined;
    if (popup?.(apiError.meta, shortageText)) return;
    NotificationService.error(parseError(error, fallbackKey));
  };

  return { parseError, showError };
};
