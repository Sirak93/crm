import type { IAppResponse, IUnit } from 'armstock-shared';
import ApiService from './ApiService';

export const UnitService = {
  async list(): Promise<IUnit[]> {
    const response = await ApiService.get<IAppResponse<IUnit[]>>('/units');
    return response.data.data!;
  },
};
