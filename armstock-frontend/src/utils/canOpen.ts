import type { AccountType, Permission } from 'armstock-shared';
import type { UserModel } from '../models/UserModel';

/** One check for routes and menu items: the account type, then at least one of the permissions (if any). */
export const canOpen = (
  user: UserModel,
  accountTypes: readonly AccountType[] | undefined,
  permissions: readonly Permission[] | undefined,
): boolean => !!accountTypes?.includes(user.accountType) && (!permissions?.length || user.canAny(permissions));
