import { useI18n } from 'vue-i18n';
import type { IStockIn } from 'armstock-shared';
import { StockInService } from '../services/StockInService';
import { NotificationService } from '../services/NotificationService';
import { STOCK_SHORTAGE_TEXT, useApiErrorMessage } from './useApiErrorMessage';

/** Confirm, delete, and tell the user. Resolves true when the document is gone. */
export const useStockInDelete = () => {
  const { t } = useI18n();
  const { showError } = useApiErrorMessage();

  const deleteStockIn = async (stockIn: IStockIn): Promise<boolean> => {
    const confirmed = await NotificationService.confirm(
      t('stockIn.deleteConfirmTitle', { number: stockIn.number }),
      t('stockIn.deleteConfirmText'),
      t('stockIn.actions.delete'),
    );
    if (!confirmed) return false;

    try {
      await StockInService.delete(stockIn.uuid);
      NotificationService.success(t('stockIn.deleted'));
      return true;
    } catch (error) {
      showError(error, 'stockIn.deleteError', STOCK_SHORTAGE_TEXT.STOCK_IN);
      return false;
    }
  };

  return { deleteStockIn };
};
