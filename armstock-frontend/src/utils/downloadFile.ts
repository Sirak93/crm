import type { AxiosResponse } from 'axios';
import ApiService from '../services/ApiService';
import i18n from '../i18n';
import { EXPORT_FALLBACK_FILE_NAME } from '../constants/constants';

/** The name the backend gave the file - `filename*` keeps Armenian letters. */
const fileNameOf = (response: AxiosResponse<Blob>): string => {
  const header = String(response.headers['content-disposition'] ?? '');
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  return encoded ? decodeURIComponent(encoded) : EXPORT_FALLBACK_FILE_NAME;
};

/** Saves a file the backend sent, as the browser's normal download. */
const saveFile = (response: AxiosResponse<Blob>): void => {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameOf(response);
  link.click();
  URL.revokeObjectURL(url);
};

/** Downloads an Excel export; its texts come in the app language. */
export const downloadExport = async (path: string, params: object): Promise<void> => {
  const response = await ApiService.get<Blob>(path, {
    params: { ...params, lang: i18n.global.locale.value },
    responseType: 'blob',
  });
  saveFile(response);
};
