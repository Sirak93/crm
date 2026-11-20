import type {
  ICompany,
  ICompanyCreatePayload,
  ICompanyPayload,
  ICompanyUser,
  ICompanyUserCreatePayload,
  ICompanyUserPayload,
} from 'armstock-shared';
import type { ICompanyCreateForm } from '../interfaces/ICompanyCreateForm';
import type { ICompanyForm } from '../interfaces/ICompanyForm';
import type { IUserForm } from '../interfaces/IUserForm';

const orNull = (value: string) => value.trim() || null;

export const toCompanyForm = (company: ICompany | null): ICompanyForm => ({
  name: company?.name ?? '',
  taxId: company?.taxId ?? '',
  phone: company?.phone ?? '',
  email: company?.email ?? '',
  address: company?.address ?? '',
});

export const toCompanyPayload = (form: ICompanyForm): ICompanyPayload => ({
  name: form.name.trim(),
  taxId: orNull(form.taxId),
  phone: orNull(form.phone),
  email: orNull(form.email),
  address: orNull(form.address),
});

export const emptyCompanyCreateForm = (): ICompanyCreateForm => ({
  ...toCompanyForm(null),
  owner: { firstName: '', lastName: '', email: '', password: '' },
});

export const toCompanyCreatePayload = (form: ICompanyCreateForm): ICompanyCreatePayload => ({
  ...toCompanyPayload(form),
  owner: {
    firstName: form.owner.firstName.trim(),
    lastName: form.owner.lastName.trim(),
    email: form.owner.email.trim(),
    password: form.owner.password,
  },
});

export const toUserForm = (user: ICompanyUser | null): IUserForm => ({
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  position: user?.position ?? '',
  roleUuid: user?.role?.uuid ?? '',
  canLogIn: user?.canLogIn ?? true,
  email: user?.email ?? '',
  password: '',
  permissions: [...(user?.permissions ?? [])],
});

/** Without login no email or password is sent. */
export const toUserPayload = (form: IUserForm): ICompanyUserPayload => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  position: orNull(form.position),
  canLogIn: form.canLogIn,
  email: form.canLogIn ? orNull(form.email) : null,
  password: form.canLogIn ? form.password || null : null,
});

/**
 * `roleUuid` must be set (the form requires it on create). Permissions go only when the person adding
 * may manage them - otherwise the server copies the role's set.
 */
export const toUserCreatePayload = (form: IUserForm, withPermissions: boolean): ICompanyUserCreatePayload => ({
  ...toUserPayload(form),
  roleUuid: form.roleUuid,
  ...(withPermissions && form.canLogIn ? { permissions: form.permissions } : {}),
});
