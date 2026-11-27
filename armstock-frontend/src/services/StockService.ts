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
import { downloadExport } from '../utils/downloadFile';
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

  /** The whole movement table as an .xlsx file, texts in the app language. */
  exportMovement(filters: IStockMovementFilters): Promise<void> {
    return downloadExport('/stock/movement/export', filters);
  },

  /** One product's movement in the range as an .xlsx file. */
  exportProductMovement(uuid: string, range: Pick<IStockMovementFilters, 'dateFrom' | 'dateTo'>): Promise<void> {
    return downloadExport(`/stock/movement/${uuid}/export`, { dateFrom: range.dateFrom, dateTo: range.dateTo });
  },

  /** The stock balance as an .xlsx file, with the page's filters. */
  exportBalance(filters: IStockBalanceFilters): Promise<void> {
    return downloadExport('/stock/balance/export', filters);
  },

  /** The kitchen balance as an .xlsx file. */
  exportKitchenBalance(filters: Omit<IStockBalanceFilters, 'inStockOnly'>): Promise<void> {
    const { search, categoryUuid } = filters;
    return downloadExport('/stock/kitchen-balance/export', { search, categoryUuid });
  },
};
