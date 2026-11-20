export interface IUserForm {
  firstName: string;
  lastName: string;
  position: string;
  /** Empty for the Owner, who has no company role. */
  roleUuid: string;
  canLogIn: boolean;
  email: string;
  /** Empty = keep the current password. */
  password: string;
}
