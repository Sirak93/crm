import type { ICompanyForm } from './ICompanyForm';
import type { ICompanyOwnerForm } from './ICompanyOwnerForm';

export interface ICompanyCreateForm extends ICompanyForm {
  owner: ICompanyOwnerForm;
}
