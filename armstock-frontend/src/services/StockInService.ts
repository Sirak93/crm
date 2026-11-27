import type { IAppResponse, IPaginationMeta, IStockIn, IStockInDetails, IStockInPayload, IStockInSummary } from 'armstock-shared';
import ApiService from './ApiService';
import { downloadExport } from '../utils/downloadFile';
import type { IStockInFilters } from '../interfaces/IStockInFilters';

/** The logged-in user's company stock-in documents. */
export const StockInService = {
  async list(page: number, pageSize: number, filters: IStockInFilters): Promise<{ items: IStockIn[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IStockIn[]>>('/stock-ins', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  /** The list as an .xlsx file, with the page's filters, all documents. */
  export(filters: IStockInFilters): Promise<void> {
    return downloadExport('/stock-ins/export', filters);
  },

  async summary(filters: IStockInFilters): Promise<IStockInSummary> {
    const response = await ApiService.get<IAppResponse<IStockInSummary>>('/stock-ins/summary', { params: filters });
    return response.data.data!;
  },

  async get(uuid: string): Promise<IStockInDetails> {
    const response = await ApiService.get<IAppResponse<IStockInDetails>>(`/stock-ins/${uuid}`);
    return response.data.data!;
  },

  async create(payload: IStockInPayload): Promise<IStockInDetails> {
    const response = await ApiService.post<IAppResponse<IStockInDetails>>('/stock-ins', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IStockInPayload): Promise<IStockInDetails> {
    const response = await ApiService.put<IAppResponse<IStockInDetails>>(`/stock-ins/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/stock-ins/${uuid}`);
  },
};
