import type { IStockOut, StockOutDepartment } from 'armstock-shared';

/** The supplier for a return, the department (and receiver) for an issue; empty for a loss. */
export const stockOutDestination = (doc: IStockOut, departmentName: (department: StockOutDepartment) => string): string => {
  if (doc.supplier) return doc.supplier.name;
  if (doc.department) {
    const department = departmentName(doc.department);
    return doc.receiver ? `${department} · ${doc.receiver.name}` : department;
  }
  return '';
};
