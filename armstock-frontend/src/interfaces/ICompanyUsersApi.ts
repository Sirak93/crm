import type { ICompanyUser, ICompanyUserPayload, IPaginationMeta, UserStatus } from 'armstock-shared';

/** One company's user calls - each owner's page passes its own endpoints. */
export interface ICompanyUsersApi {
  list(page: number, pageSize: number, search: string): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }>;
  create(payload: ICompanyUserPayload): Promise<ICompanyUser>;
  update(uuid: string, payload: ICompanyUserPayload): Promise<ICompanyUser>;
  setStatus(uuid: string, status: UserStatus): Promise<ICompanyUser>;
}
