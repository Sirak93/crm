import { useI18n } from 'vue-i18n';
import {
  STOCK_IN_REASON_NAMES,
  STOCK_OUT_DEPARTMENT_NAMES,
  STOCK_OUT_REASON_NAMES,
  type Locale,
  type StockInReason,
  type StockOutDepartment,
  type StockOutReason,
} from 'armstock-shared';

/** Reason and department names in the current language, from the shared lists the Excel export also uses. */
export const useStockReasons = () => {
  const { locale } = useI18n();

  const stockInReasonName = (reason: StockInReason): string => STOCK_IN_REASON_NAMES[reason][locale.value as Locale];
  const stockOutReasonName = (reason: StockOutReason): string => STOCK_OUT_REASON_NAMES[reason][locale.value as Locale];

  const departmentName = (department: StockOutDepartment): string => STOCK_OUT_DEPARTMENT_NAMES[department][locale.value as Locale];

  return { stockInReasonName, stockOutReasonName, departmentName };
};
