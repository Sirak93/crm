import { useI18n } from 'vue-i18n';
import type { IStockOut } from 'armstock-shared';
import { StockOutService } from '../services/StockOutService';
import { NotificationService } from '../services/NotificationService';
import { useApiErrorMessage } from './useApiErrorMessage';

/** Confirm, delete, and tell the user. Resolves true when the document is gone. */
export const useStockOutDelete = () => {
  const { t } = useI18n();
  const { showError } = useApiErrorMessage();

  const deleteStockOut = async (stockOut: IStockOut): Promise<boolean> => {
    const confirmed = await NotificationService.confirm(
      t('stockOut.deleteConfirmTitle', { number: stockOut.number }),
      t('stockOut.deleteConfirmText'),
      t('stockOut.actions.delete'),
    );
    if (!confirmed) return false;

    try {
      await StockOutService.delete(stockOut.uuid);
      NotificationService.success(t('stockOut.deleted'));
      return true;
    } catch (error) {
      showError(error, 'stockOut.deleteError');
      return false;
    }
  };

  return { deleteStockOut };
};
