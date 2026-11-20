import type {
  CompanyStatus,
  IAppResponse,
  ICompany,
  ICompanyPayload,
  ICompanyUser,
  ICompanyUserPayload,
  IPaginationMeta,
  UserStatus,
} from 'armstock-shared';
import ApiService from '../ApiService';
import type { IUserFilters } from '../../interfaces/IUserFilters';

export const PlatformCompaniesService = {
  async list(page: number, pageSize: number, search: string): Promise<{ items: ICompany[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<ICompany[]>>('/platform/companies', {
      params: { page, pageSize, search: search || undefined },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async create(payload: ICompanyPayload): Promise<ICompany> {
    const response = await ApiService.post<IAppResponse<ICompany>>('/platform/companies', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: ICompanyPayload): Promise<ICompany> {
    const response = await ApiService.put<IAppResponse<ICompany>>(`/platform/companies/${uuid}`, payload);
    return response.data.data!;
  },

  async setStatus(uuid: string, status: CompanyStatus): Promise<ICompany> {
    const response = await ApiService.patch<IAppResponse<ICompany>>(`/platform/companies/${uuid}/status`, { status });
    return response.data.data!;
  },

  async get(uuid: string): Promise<ICompany> {
    const response = await ApiService.get<IAppResponse<ICompany>>(`/platform/companies/${uuid}`);
    return response.data.data!;
  },

  async listUsers(companyUuid: string, page: number, pageSize: number, filters: IUserFilters): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<ICompanyUser[]>>(`/platform/companies/${companyUuid}/users`, {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async createUser(companyUuid: string, payload: ICompanyUserPayload): Promise<ICompanyUser> {
    const response = await ApiService.post<IAppResponse<ICompanyUser>>(`/platform/companies/${companyUuid}/users`, payload);
    return response.data.data!;
  },

  async updateUser(companyUuid: string, uuid: string, payload: ICompanyUserPayload): Promise<ICompanyUser> {
    const response = await ApiService.put<IAppResponse<ICompanyUser>>(`/platform/companies/${companyUuid}/users/${uuid}`, payload);
    return response.data.data!;
  },

  async setUserStatus(companyUuid: string, uuid: string, status: UserStatus): Promise<ICompanyUser> {
    const response = await ApiService.patch<IAppResponse<ICompanyUser>>(
      `/platform/companies/${companyUuid}/users/${uuid}/status`,
      { status },
    );
    return response.data.data!;
  },
};
