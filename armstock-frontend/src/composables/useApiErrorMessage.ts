import { isAxiosError } from 'axios';
import { useI18n } from 'vue-i18n';
import { ErrorCodes, RECIPE_QUANTITY_DECIMALS, type IStockShortage, type ISupplierReturnError } from 'armstock-shared';
import { NotificationService } from '../services/NotificationService';
import { formatQuantity } from '../utils/format';
import { useMeasureUnits } from './useMeasureUnits';

/**
 * "Not enough stock" texts: a stock-out takes too much; a stock-in edit/delete takes back goods that already went out.
 * `kitchen` is for "not enough in the kitchen": a stock-out gives less than its recipes need, or its delete takes back
 * what the kitchen already used.
 */
export const STOCK_SHORTAGE_TEXT = {
  STOCK_OUT: {
    text: 'stockShortage.text',
    value: 'stockShortage.available',
    kitchen: { text: 'kitchenShortage.text', value: 'kitchenShortage.available' },
  },
  STOCK_OUT_DELETE: {
    text: 'stockShortage.text',
    value: 'stockShortage.available',
    kitchen: { text: 'kitchenShortage.deleteText', value: 'kitchenShortage.inKitchen' },
  },
  STOCK_IN_EDIT: { text: 'stockShortage.stockInEditText', value: 'stockShortage.inStock' },
  STOCK_IN_DELETE: { text: 'stockShortage.stockInDeleteText', value: 'stockShortage.inStock' },
} as const;

interface IStockShortageText {
  text: string;
  value: string;
  kitchen?: { text: string; value: string };
}

/** The translated message for an API error code (`errors.<CODE>`), or the fallback key's text. */
export const useApiErrorMessage = () => {
  const { t, te } = useI18n();
  const { unitShortName } = useMeasureUnits();

  /** An object `meta` fills the text's placeholders (e.g. `{userCount}`). */
  const parseError = (error: unknown, fallbackKey: string): string => {
    const apiError = isAxiosError(error) ? error.response?.data?.error : undefined;
    const key = `errors.${apiError?.code}`;
    if (!apiError?.code || !te(key)) return t(fallbackKey);
    const meta = apiError.meta;
    return meta && typeof meta === 'object' && !Array.isArray(meta) ? t(key, meta) : t(key);
  };

  const shortagePopup = (meta: unknown, titleKey: string, text: { text: string; value: string }, decimals?: number): boolean => {
    if (!Array.isArray(meta) || !meta.length) return false;
    NotificationService.alertList(
      t(titleKey),
      t(text.text),
      (meta as IStockShortage[]).map((s) => ({
        label: s.name,
        value: t(text.value, { quantity: formatQuantity(s.available, decimals), unit: unitShortName(s.measureUnit) }),
      })),
    );
    return true;
  };

  /** A popup for each error that lists products; returns false when its `meta` is missing. */
  const POPUPS: Record<string, (meta: unknown, shortageText: IStockShortageText) => boolean> = {
    [ErrorCodes.STOCK.NOT_ENOUGH.CODE]: (meta, shortageText) => shortagePopup(meta, 'stockShortage.title', shortageText),
    [ErrorCodes.STOCK.KITCHEN_NOT_ENOUGH.CODE]: (meta, shortageText) =>
      shortagePopup(meta, 'kitchenShortage.title', shortageText.kitchen ?? STOCK_SHORTAGE_TEXT.STOCK_OUT.kitchen, RECIPE_QUANTITY_DECIMALS),
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
        value: t(`supplierReturn.${valueKey}`, { quantity: formatQuantity(p.quantity), unit: unitShortName(p.measureUnit) }),
      })),
    );
    return true;
  };

  /** Errors that list products open a popup (too long for a toast); every other error is a toast. */
  const showError = (error: unknown, fallbackKey: string, shortageText: IStockShortageText = STOCK_SHORTAGE_TEXT.STOCK_OUT): void => {
    const apiError = isAxiosError(error) ? error.response?.data?.error : undefined;
    const popup = apiError?.code ? POPUPS[apiError.code] : undefined;
    if (popup?.(apiError.meta, shortageText)) return;
    NotificationService.error(parseError(error, fallbackKey));
  };

  return { parseError, showError };
};
