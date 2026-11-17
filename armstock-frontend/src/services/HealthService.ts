import type { IAppResponse, IHealthStatus } from 'armstock-shared';
import ApiService from './ApiService';

export const HealthService = {
  async getStatus(): Promise<IHealthStatus> {
    const response = await ApiService.get<IAppResponse<IHealthStatus>>('/health');
    return response.data.data!;
  },
};
