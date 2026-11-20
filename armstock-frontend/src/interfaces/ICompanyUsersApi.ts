import type {
  ICompanyUser,
  ICompanyUserAccessPayload,
  ICompanyUserCreatePayload,
  ICompanyUserPayload,
  INamedRef,
  IPaginationMeta,
  IRole,
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
  /** Company side only - the Platform Owner manages roles and permissions later. */
  setAccess?(uuid: string, payload: ICompanyUserAccessPayload): Promise<ICompanyUser>;
  /** The roles with their permissions - for the permission panel; company side only. */
  roleTemplates?(): Promise<IRole[]>;
}
