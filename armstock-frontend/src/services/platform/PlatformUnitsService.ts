import type { IAppResponse, IUnit, IUnitPayload } from 'armstock-shared';
import ApiService from '../ApiService';

export const PlatformUnitsService = {
  async create(payload: IUnitPayload): Promise<IUnit> {
    const response = await ApiService.post<IAppResponse<IUnit>>('/platform/units', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IUnitPayload): Promise<IUnit> {
    const response = await ApiService.put<IAppResponse<IUnit>>(`/platform/units/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/platform/units/${uuid}`);
  },
};
