import { UserRole } from 'armstock-shared';

export const ROLE_LABEL_KEY: Record<UserRole, string> = {
  [UserRole.PLATFORM_OWNER]: 'roles.platformOwner',
  [UserRole.COMPANY_OWNER]: 'roles.companyOwner',
  [UserRole.STOREKEEPER]: 'roles.storekeeper',
  [UserRole.ACCOUNTANT]: 'roles.accountant',
};
