import type { IAppResponse, IRole } from 'armstock-shared';
import ApiService from '../ApiService';

/** The company's roles with their permissions - Owner or MANAGE_USER_PERMISSIONS only. */
export const RoleService = {
  async list(): Promise<IRole[]> {
    const response = await ApiService.get<IAppResponse<IRole[]>>('/roles');
    return response.data.data!;
  },
};
