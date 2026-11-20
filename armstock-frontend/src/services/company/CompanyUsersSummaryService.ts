import type { IAppResponse, ICompanyUsersSummary } from 'armstock-shared';
import ApiService from '../ApiService';

/** Active and blocked user counts of the logged-in user's company. */
export const CompanyUsersSummaryService = {
  async get(): Promise<ICompanyUsersSummary> {
    const response = await ApiService.get<IAppResponse<ICompanyUsersSummary>>('/company/users/summary');
    return response.data.data!;
  },
};
