import { ref } from 'vue';
import { isAxiosError } from 'axios';
import { NotificationService } from '../services/NotificationService';
import { useApiErrorMessage } from './useApiErrorMessage';
import { AppLogger } from '../utils/AppLogger';

/** A download's error body arrives as a Blob - read it as the usual JSON error. */
const readBlobError = async (error: unknown): Promise<void> => {
  if (!isAxiosError(error) || !(error.response?.data instanceof Blob)) return;
  try {
    error.response.data = JSON.parse(await error.response.data.text());
  } catch {
    // Not JSON (e.g. a proxy page) - the general message is shown.
  }
};

/** Runs one Excel download at a time and tells the user when it fails (e.g. too many rows). */
export const useExcelExport = () => {
  const { parseError } = useApiErrorMessage();
  const isExporting = ref(false);

  const runExport = async (download: () => Promise<void>) => {
    if (isExporting.value) return;
    isExporting.value = true;
    try {
      await download();
    } catch (error) {
      AppLogger.error('Failed to export the Excel file:', error);
      await readBlobError(error);
      NotificationService.error(parseError(error, 'common.exportError'));
    } finally {
      isExporting.value = false;
    }
  };

  return { isExporting, runExport };
};
