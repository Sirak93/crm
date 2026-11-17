import type { IAppResponse, IProductCategory, IProductCategoryPayload } from 'armstock-shared';
import ApiService from './ApiService';

/** The logged-in user's company product categories. */
export const ProductCategoryService = {
  async list(): Promise<IProductCategory[]> {
    const response = await ApiService.get<IAppResponse<IProductCategory[]>>('/product-categories');
    return response.data.data!;
  },

  async create(payload: IProductCategoryPayload): Promise<IProductCategory> {
    const response = await ApiService.post<IAppResponse<IProductCategory>>('/product-categories', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IProductCategoryPayload): Promise<IProductCategory> {
    const response = await ApiService.put<IAppResponse<IProductCategory>>(`/product-categories/${uuid}`, payload);
    return response.data.data!;
  },

  async delete(uuid: string): Promise<void> {
    await ApiService.delete(`/product-categories/${uuid}`);
  },
};
