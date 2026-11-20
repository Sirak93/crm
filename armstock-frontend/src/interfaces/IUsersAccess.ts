import type { Permission } from 'armstock-shared';

/** What the logged-in user may do on a users page. */
export interface IUsersAccess {
  canView: boolean;
  canAdd: boolean;
  /** Basic data, login, block, and archive. */
  canEdit: boolean;
  /** Role and permissions of a member - never on your own account. */
  canManageAccess: boolean;
  /** Only the Platform Owner touches the Company Owner account. */
  canEditOwner: boolean;
  /** Permissions this user may not turn on or off for others (owner-only ones for a member). */
  lockedPermissions: readonly Permission[];
}
