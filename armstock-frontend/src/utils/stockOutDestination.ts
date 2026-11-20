import type { IStockOut } from 'armstock-shared';
import { STOCK_OUT_DEPARTMENT_LABEL } from '../constants/stockOutReasons';

/** The supplier for a return, the department (and receiver) for an issue; empty for a loss. */
export const stockOutDestination = (doc: IStockOut, t: (key: string) => string): string => {
  if (doc.supplier) return doc.supplier.name;
  if (doc.department) {
    const department = t(STOCK_OUT_DEPARTMENT_LABEL[doc.department]);
    return doc.receiver ? `${department} · ${doc.receiver.name}` : department;
  }
  return '';
};
