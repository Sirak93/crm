/** Commands of the table row actions menu - each table shows only the ones it needs. */
export const ROW_ACTION = {
  VIEW: 'view',
  EDIT: 'edit',
  DELETE: 'delete',
  ARCHIVE: 'archive',
  RESTORE: 'restore',
  BLOCK: 'block',
  ACTIVATE: 'activate',
  USERS: 'users',
  EXPORT: 'export',
} as const;

export type RowAction = typeof ROW_ACTION[keyof typeof ROW_ACTION];
