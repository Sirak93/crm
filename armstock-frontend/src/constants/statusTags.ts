import { CompanyStatus } from 'armstock-shared';
import type { IStatusTag } from '../interfaces/IStatusTag';

export const COMPANY_STATUS_TAG: Record<CompanyStatus, IStatusTag> = {
  [CompanyStatus.ACTIVE]: { labelKey: 'status.active', type: 'success' },
  [CompanyStatus.BLOCKED]: { labelKey: 'status.blocked', type: 'danger' },
};
