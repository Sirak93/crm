import { COMPANY_LOGIN_ROLES, type ICompany, type ICompanyPayload, type ICompanyUser, type ICompanyUserPayload } from 'armstock-shared';
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

export const toUserForm = (user: ICompanyUser | null): IUserForm => ({
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  position: user?.position ?? '',
  role: user?.role,
  email: user?.email ?? '',
  password: '',
});

/** `role` must be set (the form requires it). STAFF never sends a password. */
export const toUserPayload = (form: IUserForm): ICompanyUserPayload => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  position: orNull(form.position),
  role: form.role!,
  email: orNull(form.email),
  password: form.role && COMPANY_LOGIN_ROLES.includes(form.role) ? form.password || null : null,
});
