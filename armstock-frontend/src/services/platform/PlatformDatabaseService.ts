import type { IAppResponse, IDatabaseStorage } from 'armstock-shared';
import ApiService from '../ApiService';

export const PlatformDatabaseService = {
  async getStorage(): Promise<IDatabaseStorage> {
    const response = await ApiService.get<IAppResponse<IDatabaseStorage>>('/platform/database/storage');
    return response.data.data!;
  },
};
