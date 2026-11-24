import type { IAppResponse, IPaginationMeta, IRecipe, IRecipeDetails, IRecipePayload } from 'armstock-shared';
import ApiService from './ApiService';
import type { IRecipeFilters } from '../interfaces/IRecipeFilters';

/** The logged-in user's company recipes. */
export const RecipeService = {
  async list(page: number, pageSize: number, filters: IRecipeFilters): Promise<{ items: IRecipe[]; meta: IPaginationMeta }> {
    const response = await ApiService.get<IAppResponse<IRecipe[]>>('/recipes', {
      params: { page, pageSize, ...filters },
    });
    return { items: response.data.data!, meta: response.data.meta as IPaginationMeta };
  },

  async get(uuid: string): Promise<IRecipeDetails> {
    const response = await ApiService.get<IAppResponse<IRecipeDetails>>(`/recipes/${uuid}`);
    return response.data.data!;
  },

  async create(payload: IRecipePayload): Promise<IRecipeDetails> {
    const response = await ApiService.post<IAppResponse<IRecipeDetails>>('/recipes', payload);
    return response.data.data!;
  },

  async update(uuid: string, payload: IRecipePayload): Promise<IRecipeDetails> {
    const response = await ApiService.put<IAppResponse<IRecipeDetails>>(`/recipes/${uuid}`, payload);
    return response.data.data!;
  },
};
