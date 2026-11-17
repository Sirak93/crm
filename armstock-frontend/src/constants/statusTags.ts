import { CompanyStatus, ProductStatus, UserStatus } from 'armstock-shared';
import type { IStatusTag } from '../interfaces/IStatusTag';

export const COMPANY_STATUS_TAG: Record<CompanyStatus, IStatusTag> = {
  [CompanyStatus.ACTIVE]: { labelKey: 'status.active', type: 'success' },
  [CompanyStatus.BLOCKED]: { labelKey: 'status.blocked', type: 'danger' },
};

export const USER_STATUS_TAG: Record<UserStatus, IStatusTag> = {
  [UserStatus.ACTIVE]: { labelKey: 'status.active', type: 'success' },
  [UserStatus.BLOCKED]: { labelKey: 'status.blocked', type: 'danger' },
};

export const PRODUCT_STATUS_TAG: Record<ProductStatus, IStatusTag> = {
  [ProductStatus.ACTIVE]: { labelKey: 'status.active', type: 'success' },
  [ProductStatus.ARCHIVED]: { labelKey: 'status.archived', type: 'info' },
};
