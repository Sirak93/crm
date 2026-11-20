import type { ICompanyUser, ICompanyUserPayload, IPaginationMeta, UserStatus } from 'armstock-shared';
import type { IUserFilters } from './IUserFilters';

/** One company's user calls - each owner's page passes its own endpoints. */
export interface ICompanyUsersApi {
  list(page: number, pageSize: number, filters: IUserFilters): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }>;
  create(payload: ICompanyUserPayload): Promise<ICompanyUser>;
  update(uuid: string, payload: ICompanyUserPayload): Promise<ICompanyUser>;
  setStatus(uuid: string, status: UserStatus): Promise<ICompanyUser>;
}
