import type { IApiLog, IAppResponse, IPaginationMeta } from 'armstock-shared';
import ApiService from '../ApiService';
import type { IApiLogFilters } from '../../interfaces/IApiLogFilters';

export const PlatformLogsService = {
  async list(page: number, pageSize: number, filters: IApiLogFilters): Promise<{ items: IApiLog[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IApiLog[]>>('/platform/logs', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async clear(): Promise<void> {
    await ApiService.delete('/platform/logs');
  },
};
