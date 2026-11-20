import type { IAppResponse, IPaginationMeta, IStockBalance, IStockBalanceSummary } from 'armstock-shared';
import ApiService from './ApiService';
import type { IStockBalanceFilters } from '../interfaces/IStockBalanceFilters';

/** The logged-in user's company stock balance. */
export const StockService = {
  async balance(page: number, pageSize: number, filters: IStockBalanceFilters): Promise<{ items: IStockBalance[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IStockBalance[]>>('/stock/balance', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async balanceSummary(filters: IStockBalanceFilters): Promise<IStockBalanceSummary> {
    const { search, categoryUuid } = filters;
    const response = await ApiService.get<IAppResponse<IStockBalanceSummary>>('/stock/balance/summary', {
      params: { search, categoryUuid },
    });
    return response.data.data!;
  },
};
