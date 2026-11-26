import { useI18n } from 'vue-i18n';
import { MEASURE_UNITS, type MeasureUnit } from 'armstock-shared';
import type { Locale } from '../constants/constants';

/** Unit names in the current language, from the fixed unit list. */
export const useMeasureUnits = () => {
  const { locale } = useI18n();

  const unitName = (unit: MeasureUnit): string => MEASURE_UNITS[unit].name[locale.value as Locale];
  const unitShortName = (unit: MeasureUnit): string => MEASURE_UNITS[unit].shortName[locale.value as Locale];

  return { unitName, unitShortName };
};
