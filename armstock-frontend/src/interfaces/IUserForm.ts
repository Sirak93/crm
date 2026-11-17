import type { UserRole } from 'armstock-shared';

export interface IUserForm {
  firstName: string;
  lastName: string;
  position: string;
  role: UserRole | undefined;
  email: string;
  /** Empty = keep the current password. */
  password: string;
}
