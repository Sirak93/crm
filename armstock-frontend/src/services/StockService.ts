import {
  PRODUCT_MOVEMENT_PAGE_SIZE,
  type IAppResponse,
  type IPaginationMeta,
  type IProductMovement,
  type IStockBalance,
  type IStockBalanceSummary,
  type IStockMovement,
} from 'armstock-shared';
import ApiService from './ApiService';
import type { IStockBalanceFilters } from '../interfaces/IStockBalanceFilters';
import type { IStockMovementFilters } from '../interfaces/IStockMovementFilters';

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

  /** Products the kitchen still has - same row shape as the stock balance. */
  async kitchenBalance(page: number, pageSize: number, filters: Omit<IStockBalanceFilters, 'inStockOnly'>): Promise<{ items: IStockBalance[]; meta: IPaginationMeta }> {
    const { search, categoryUuid } = filters;
    const response = await ApiService.get<IAppResponse<IStockBalance[]>>('/stock/kitchen-balance', {
      params: { page, pageSize, search, categoryUuid },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  /** Initial, in, out and final per product for the date range. */
  async movement(page: number, pageSize: number, filters: IStockMovementFilters): Promise<{ items: IStockMovement[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IStockMovement[]>>('/stock/movement', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  /** One page of a product's documents in the range, with its movement numbers. */
  async productMovement(
    uuid: string,
    page: number,
    range: Pick<IStockMovementFilters, 'dateFrom' | 'dateTo'>,
  ): Promise<{ data: IProductMovement; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IProductMovement>>(`/stock/movement/${uuid}`, {
      params: { page, pageSize: PRODUCT_MOVEMENT_PAGE_SIZE, dateFrom: range.dateFrom, dateTo: range.dateTo },
    });
    return { data: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },
};
