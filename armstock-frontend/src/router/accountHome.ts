import { AccountType } from 'armstock-shared';
import { ROUTE_NAME, type RouteName } from '../constants/constants';

/** Each account type's start page - open to every user of that type, so a lost-access popup always lands safely. */
export const ACCOUNT_HOME_ROUTE: Record<AccountType, RouteName> = {
  [AccountType.PLATFORM_OWNER]: ROUTE_NAME.PLATFORM_DASHBOARD,
  [AccountType.COMPANY_OWNER]: ROUTE_NAME.COMPANY_DASHBOARD,
  [AccountType.COMPANY_MEMBER]: ROUTE_NAME.COMPANY_DASHBOARD,
};
