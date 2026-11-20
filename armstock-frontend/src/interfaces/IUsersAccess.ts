/** What the logged-in user may do on a users page. */
export interface IUsersAccess {
  canView: boolean;
  canAdd: boolean;
  /** Basic data, login, block, and archive. */
  canEdit: boolean;
  /** Move an existing member to another role - never on your own account. */
  canChangeRole: boolean;
  /** Only the Platform Owner touches the Company Owner account. */
  canEditOwner: boolean;
}
