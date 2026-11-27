import { useI18n } from 'vue-i18n';
import { convertQuantity, MEASURE_UNITS, RECIPE_QUANTITY_DECIMALS, type Locale, type MeasureUnit } from 'armstock-shared';
import { formatQuantity } from '../utils/format';
import { recipeUnit } from '../utils/recipeUnit';

/** Unit names in the current language, from the fixed unit list. */
export const useMeasureUnits = () => {
  const { locale } = useI18n();

  const unitName = (unit: MeasureUnit): string => MEASURE_UNITS[unit].name[locale.value as Locale];
  const unitShortName = (unit: MeasureUnit): string => MEASURE_UNITS[unit].shortName[locale.value as Locale];

  /** A recipe amount in the small unit, as the chef typed it: 5 գ, not 0.005 կգ. */
  const formatRecipeAmount = (quantity: number, unit: MeasureUnit): string => {
    const small = recipeUnit(unit);
    return `${formatQuantity(convertQuantity(quantity, unit, small, RECIPE_QUANTITY_DECIMALS), RECIPE_QUANTITY_DECIMALS)} ${unitShortName(small)}`;
  };

  return { unitName, unitShortName, formatRecipeAmount };
};
