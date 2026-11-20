import type { IAppResponse, INamedRef, IStockLineProduct, IStockOutReceiver, ISupplierOption } from 'armstock-shared';
import ApiService from './ApiService';
import type { IProductOptionsFilters } from '../interfaces/IProductOptionsFilters';

/** Picker lists - open to every company member, whatever their permissions. */
export const OptionsService = {
  async products(filters: IProductOptionsFilters): Promise<IStockLineProduct[]> {
    const response = await ApiService.get<IAppResponse<IStockLineProduct[]>>('/options/products', { params: filters });
    return response.data.data!;
  },

  async suppliers(search: string | undefined, activeOnly: boolean): Promise<ISupplierOption[]> {
    const response = await ApiService.get<IAppResponse<ISupplierOption[]>>('/options/suppliers', {
      params: { search, activeOnly },
    });
    return response.data.data!;
  },

  async receivers(): Promise<IStockOutReceiver[]> {
    const response = await ApiService.get<IAppResponse<IStockOutReceiver[]>>('/options/receivers');
    return response.data.data!;
  },

  async roles(): Promise<INamedRef[]> {
    const response = await ApiService.get<IAppResponse<INamedRef[]>>('/options/roles');
    return response.data.data!;
  },
};
