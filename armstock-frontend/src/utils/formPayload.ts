import type { ICompany, ICompanyPayload, ICompanyStaff, ICompanyStaffPayload } from 'armstock-shared';
import type { ICompanyForm } from '../interfaces/ICompanyForm';
import type { IStaffForm } from '../interfaces/IStaffForm';

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

export const toStaffForm = (staff: ICompanyStaff | null): IStaffForm => ({
  firstName: staff?.firstName ?? '',
  lastName: staff?.lastName ?? '',
  position: staff?.position ?? '',
});

export const toStaffPayload = (form: IStaffForm): ICompanyStaffPayload => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  position: orNull(form.position),
});
