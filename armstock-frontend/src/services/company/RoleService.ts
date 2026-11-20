import type { IAppResponse, IRole, IRolePayload } from 'armstock-shared';
import ApiService from '../ApiService';

/** The company's roles with their permissions - Owner or MANAGE_USER_PERMISSIONS only. */
export const RoleService = {
  async list(): Promise<IRole[]> {
    const response = await ApiService.get<IAppResponse<IRole[]>>('/roles');
    return response.data.data!;
  },

  async create(payload: IRolePayload): Promise<IRole> {
    const response = await ApiService.post<IAppResponse<IRole>>('/roles', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IRolePayload): Promise<IRole> {
    const response = await ApiService.put<IAppResponse<IRole>>(`/roles/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/roles/${uuid}`);
  },
};
