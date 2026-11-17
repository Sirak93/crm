import type { IAppResponse, IMeasureUnit, IMeasureUnitPayload } from 'armstock-shared';
import ApiService from './ApiService';

/** The logged-in user's company units. */
export const MeasureUnitService = {
  async list(): Promise<IMeasureUnit[]> {
    const response = await ApiService.get<IAppResponse<IMeasureUnit[]>>('/measure-units');
    return response.data.data!;
  },

  async create(payload: IMeasureUnitPayload): Promise<IMeasureUnit> {
    const response = await ApiService.post<IAppResponse<IMeasureUnit>>('/measure-units', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IMeasureUnitPayload): Promise<IMeasureUnit> {
    const response = await ApiService.put<IAppResponse<IMeasureUnit>>(`/measure-units/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/measure-units/${uuid}`);
  },
};
