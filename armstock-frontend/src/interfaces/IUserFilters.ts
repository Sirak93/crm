import type { UserStatus } from 'armstock-shared';

export interface IUserFilters {
  search?: string;
  status?: UserStatus;
  roleUuid?: string;
}
