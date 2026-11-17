import type { IAppResponse, ICompany, ICompanyPayload, IPaginationMeta } from 'armstock-shared';
import ApiService from '../ApiService';

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

  async setActive(uuid: string, isActive: boolean): Promise<ICompany> {
    const response = await ApiService.patch<IAppResponse<ICompany>>(`/platform/companies/${uuid}/active`, { isActive });
    return response.data.data!;
  },
};
