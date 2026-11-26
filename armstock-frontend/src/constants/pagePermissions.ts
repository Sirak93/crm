import { Permission } from 'armstock-shared';

// Categories have no view permission - their pages show for anyone with one of their actions.
export const PRODUCT_CATEGORY_PERMISSIONS = [
  Permission.PRODUCT_CATEGORY_ADD,
  Permission.PRODUCT_CATEGORY_EDIT,
  Permission.PRODUCT_CATEGORY_DELETE,
] as const;
