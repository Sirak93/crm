import type { IAppResponse, IUnit, IUnitPayload } from 'armstock-shared';
import ApiService from './ApiService';

/** The logged-in user's company units. */
export const UnitService = {
  async list(): Promise<IUnit[]> {
    const response = await ApiService.get<IAppResponse<IUnit[]>>('/units');
    return response.data.data!;
  },

  async create(payload: IUnitPayload): Promise<IUnit> {
    const response = await ApiService.post<IAppResponse<IUnit>>('/units', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IUnitPayload): Promise<IUnit> {
    const response = await ApiService.put<IAppResponse<IUnit>>(`/units/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/units/${uuid}`);
  },
};
