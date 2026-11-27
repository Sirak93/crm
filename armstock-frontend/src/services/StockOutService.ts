import type {
  IAppResponse,
  IPaginationMeta,
  IStockOut,
  IStockOutDetails,
  IStockOutPayload,
  IStockOutSummary,
} from 'armstock-shared';
import ApiService from './ApiService';
import { downloadExport } from '../utils/downloadFile';
import type { IStockOutFilters } from '../interfaces/IStockOutFilters';

/** The logged-in user's company stock-out documents. */
export const StockOutService = {
  async list(page: number, pageSize: number, filters: IStockOutFilters): Promise<{ items: IStockOut[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IStockOut[]>>('/stock-outs', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  /** The list as an .xlsx file, with the page's filters, all documents. */
  export(filters: IStockOutFilters): Promise<void> {
    return downloadExport('/stock-outs/export', filters);
  },

  async summary(filters: IStockOutFilters): Promise<IStockOutSummary> {
    const response = await ApiService.get<IAppResponse<IStockOutSummary>>('/stock-outs/summary', { params: filters });
    return response.data.data!;
  },

  async get(uuid: string): Promise<IStockOutDetails> {
    const response = await ApiService.get<IAppResponse<IStockOutDetails>>(`/stock-outs/${uuid}`);
    return response.data.data!;
  },

  async create(payload: IStockOutPayload): Promise<IStockOutDetails> {
    const response = await ApiService.post<IAppResponse<IStockOutDetails>>('/stock-outs', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IStockOutPayload): Promise<IStockOutDetails> {
    const response = await ApiService.put<IAppResponse<IStockOutDetails>>(`/stock-outs/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/stock-outs/${uuid}`);
  },
};
