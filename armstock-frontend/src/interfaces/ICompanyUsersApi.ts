import type {
  ICompanyUser,
  ICompanyUserCreatePayload,
  ICompanyUserPayload,
  INamedRef,
  IPaginationMeta,
  UserStatus,
} from 'armstock-shared';
import type { IUserFilters } from './IUserFilters';

/** One company's user calls - the company page and the Platform Owner's page pass their own endpoints. */
export interface ICompanyUsersApi {
  list(page: number, pageSize: number, filters: IUserFilters): Promise<{ items: ICompanyUser[]; meta: IPaginationMeta }>;
  create(payload: ICompanyUserCreatePayload): Promise<ICompanyUser>;
  update(uuid: string, payload: ICompanyUserPayload): Promise<ICompanyUser>;
  setStatus(uuid: string, status: UserStatus): Promise<ICompanyUser>;
  /** The company's roles, for the role picker and filter. */
  roles(): Promise<INamedRef[]>;
  /** Company side only - the Platform Owner changes roles later. */
  setRole?(uuid: string, roleUuid: string): Promise<ICompanyUser>;
}
