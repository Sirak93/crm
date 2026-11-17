import { UserRole } from 'armstock-shared';
import { ROUTE_NAME, type RouteName } from '../constants/constants';

/** Each role's start page. Roles without pages yet have no entry. */
export const ROLE_HOME_ROUTE: Partial<Record<UserRole, RouteName>> = {
  [UserRole.PLATFORM_OWNER]: ROUTE_NAME.PLATFORM_DASHBOARD,
  [UserRole.COMPANY_OWNER]: ROUTE_NAME.COMPANY_DASHBOARD,
  [UserRole.STOREKEEPER]: ROUTE_NAME.COMPANY_DASHBOARD,
  [UserRole.ACCOUNTANT]: ROUTE_NAME.COMPANY_DASHBOARD,
};
