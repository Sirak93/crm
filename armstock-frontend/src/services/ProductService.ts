import type {
  IAppResponse,
  IPaginationMeta,
  IProduct,
  IProductCreatePayload,
  IProductPayload,
  ProductStatus,
} from 'armstock-shared';
import ApiService from './ApiService';
import type { IProductFilters } from '../interfaces/IProductFilters';

/** The logged-in user's company products. */
export const ProductService = {
  async list(page: number, pageSize: number, filters: IProductFilters): Promise<{ items: IProduct[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IProduct[]>>('/products', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async create(payload: IProductCreatePayload): Promise<IProduct> {
    const response = await ApiService.post<IAppResponse<IProduct>>('/products', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IProductPayload): Promise<IProduct> {
    const response = await ApiService.put<IAppResponse<IProduct>>(`/products/${uuid}`, payload);
    return response.data.data!;
  },

  async setStatus(uuid: string, status: ProductStatus): Promise<IProduct> {
    const response = await ApiService.patch<IAppResponse<IProduct>>(`/products/${uuid}/status`, { status });
    return response.data.data!;
  },
};
