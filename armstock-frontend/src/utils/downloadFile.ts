import type { AxiosResponse } from 'axios';

/** The name the backend gave the file - `filename*` keeps Armenian letters. */
const fileNameOf = (response: AxiosResponse<Blob>, fallback: string): string => {
  const header = String(response.headers['content-disposition'] ?? '');
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  return encoded ? decodeURIComponent(encoded) : fallback;
};

/** Saves a file the backend sent, as the browser's normal download. */
export const downloadFile = (response: AxiosResponse<Blob>, fallbackName: string): void => {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameOf(response, fallbackName);
  link.click();
  URL.revokeObjectURL(url);
};
