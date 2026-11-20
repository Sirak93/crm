import { Permission } from 'armstock-shared';

// Units and categories have no view permission - their pages show for anyone with one of their actions.
export const MEASURE_UNIT_PERMISSIONS = [Permission.MEASURE_UNIT_ADD, Permission.MEASURE_UNIT_EDIT, Permission.MEASURE_UNIT_DELETE] as const;
export const PRODUCT_CATEGORY_PERMISSIONS = [
  Permission.PRODUCT_CATEGORY_ADD,
  Permission.PRODUCT_CATEGORY_EDIT,
  Permission.PRODUCT_CATEGORY_DELETE,
] as const;
