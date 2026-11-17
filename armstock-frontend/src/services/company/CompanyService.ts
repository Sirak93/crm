import type { IAppResponse, ICompany, ICompanyPayload } from 'armstock-shared';
import ApiService from '../ApiService';

/** The logged-in user's own company. */
export const CompanyService = {
  async get(): Promise<ICompany> {
    const response = await ApiService.get<IAppResponse<ICompany>>('/company');
    return response.data.data!;
  },

  async update(payload: ICompanyPayload): Promise<ICompany> {
    const response = await ApiService.put<IAppResponse<ICompany>>('/company', payload);
    return response.data.data!;
  },
};
