import type {
  IAppResponse,
  ICompanyStaff,
  ICompanyStaffPayload,
  IPaginationMeta,
  IStaffLoginPayload,
  UserRole,
  UserStatus,
} from 'armstock-shared';
import ApiService from '../ApiService';

export const CompanyStaffService = {
  async list(page: number, pageSize: number, search: string): Promise<{ items: ICompanyStaff[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<ICompanyStaff[]>>('/company/staff', {
      params: { page, pageSize, search: search || undefined },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async create(payload: ICompanyStaffPayload): Promise<ICompanyStaff> {
    const response = await ApiService.post<IAppResponse<ICompanyStaff>>('/company/staff', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: ICompanyStaffPayload): Promise<ICompanyStaff> {
    const response = await ApiService.put<IAppResponse<ICompanyStaff>>(`/company/staff/${uuid}`, payload);
    return response.data.data!;
  },

  async giveLogin(uuid: string, payload: IStaffLoginPayload): Promise<ICompanyStaff> {
    const response = await ApiService.post<IAppResponse<ICompanyStaff>>(`/company/staff/${uuid}/login`, payload);
    return response.data.data!;
  },

  async setRole(uuid: string, role: UserRole): Promise<ICompanyStaff> {
    const response = await ApiService.patch<IAppResponse<ICompanyStaff>>(`/company/staff/${uuid}/login/role`, { role });
    return response.data.data!;
  },

  async setLoginStatus(uuid: string, status: UserStatus): Promise<ICompanyStaff> {
    const response = await ApiService.patch<IAppResponse<ICompanyStaff>>(`/company/staff/${uuid}/login/status`, { status });
    return response.data.data!;
  },
};
