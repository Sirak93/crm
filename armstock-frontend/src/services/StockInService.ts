import type { IAppResponse, IPaginationMeta, IStockIn, IStockInDetails, IStockInPayload } from 'armstock-shared';
import ApiService from './ApiService';
import type { IStockInFilters } from '../interfaces/IStockInFilters';

/** The logged-in user's company stock-in documents. */
export const StockInService = {
  async list(page: number, pageSize: number, filters: IStockInFilters): Promise<{ items: IStockIn[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IStockIn[]>>('/stock-ins', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
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
