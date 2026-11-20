import type { IAppResponse, ICompanyUser, ICompanyUserPayload, IPaginationMeta, UserStatus } from 'armstock-shared';
import ApiService from '../ApiService';
import type { ICompanyUsersApi } from '../../interfaces/ICompanyUsersApi';
import type { IUserFilters } from '../../interfaces/IUserFilters';

/** The Company Owner's own company users. */
export const CompanyUsersService: ICompanyUsersApi = {
  async list(page: number, pageSize: number, filters: IUserFilters): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<ICompanyUser[]>>('/company/users', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async create(payload: ICompanyUserPayload): Promise<ICompanyUser> {
    const response = await ApiService.post<IAppResponse<ICompanyUser>>('/company/users', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: ICompanyUserPayload): Promise<ICompanyUser> {
    const response = await ApiService.put<IAppResponse<ICompanyUser>>(`/company/users/${uuid}`, payload);
    return response.data.data!;
  },

  async setStatus(uuid: string, status: UserStatus): Promise<ICompanyUser> {
    const response = await ApiService.patch<IAppResponse<ICompanyUser>>(`/company/users/${uuid}/status`, { status });
    return response.data.data!;
  },
};
