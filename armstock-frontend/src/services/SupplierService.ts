import type { IAppResponse, IPaginationMeta, ISupplier, ISupplierPayload, SupplierStatus } from 'armstock-shared';
import ApiService from './ApiService';
import type { ISupplierFilters } from '../interfaces/ISupplierFilters';

/** The logged-in user's company suppliers. */
export const SupplierService = {
  async list(page: number, pageSize: number, filters: ISupplierFilters): Promise<{ items: ISupplier[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<ISupplier[]>>('/suppliers', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async create(payload: ISupplierPayload): Promise<ISupplier> {
    const response = await ApiService.post<IAppResponse<ISupplier>>('/suppliers', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: ISupplierPayload): Promise<ISupplier> {
    const response = await ApiService.put<IAppResponse<ISupplier>>(`/suppliers/${uuid}`, payload);
    return response.data.data!;
  },

  async setStatus(uuid: string, status: SupplierStatus): Promise<ISupplier> {
    const response = await ApiService.patch<IAppResponse<ISupplier>>(`/suppliers/${uuid}/status`, { status });
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/suppliers/${uuid}`);
  },
};
