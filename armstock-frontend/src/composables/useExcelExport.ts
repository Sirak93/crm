import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NotificationService } from '../services/NotificationService';
import { AppLogger } from '../utils/AppLogger';

/** Runs one Excel download at a time and tells the user when it fails. */
export const useExcelExport = () => {
  const { t } = useI18n();
  const isExporting = ref(false);

  const runExport = async (download: () => Promise<void>) => {
    if (isExporting.value) return;
    isExporting.value = true;
    try {
      await download();
    } catch (error) {
      AppLogger.error('Failed to export the Excel file:', error);
      NotificationService.error(t('common.exportError'));
    } finally {
      isExporting.value = false;
    }
  };

  return { isExporting, runExport };
};
