import { useI18n } from 'vue-i18n';
import { convertibleUnits, convertQuantity, MEASURE_UNITS, RECIPE_QUANTITY_DECIMALS, unitRatio, type Locale, type MeasureUnit } from 'armstock-shared';
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

  /** An amount in the unit that reads best: below 1 կգ / լ in գ / մլ, else in կգ / լ; count units stay. */
  const formatAmount = (quantity: number, unit: MeasureUnit): string => {
    if (MEASURE_UNITS[unit].factor === null) return `${formatQuantity(quantity)} ${unitShortName(unit)}`;
    const base = convertibleUnits(unit).find((u) => MEASURE_UNITS[u].factor === 1)!;
    const target = Math.abs(quantity * unitRatio(unit, base)) < 1 ? recipeUnit(unit) : base;
    return `${formatQuantity(convertQuantity(quantity, unit, target, RECIPE_QUANTITY_DECIMALS), RECIPE_QUANTITY_DECIMALS)} ${unitShortName(target)}`;
  };

  return { unitName, unitShortName, formatRecipeAmount, formatAmount };
};
