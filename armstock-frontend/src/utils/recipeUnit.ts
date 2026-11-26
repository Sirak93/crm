import { convertibleUnits, MEASURE_UNITS, type MeasureUnit } from 'armstock-shared';

const smaller = (a: MeasureUnit, b: MeasureUnit): MeasureUnit => (MEASURE_UNITS[b].factor! < MEASURE_UNITS[a].factor! ? b : a);

/** Recipes are per 1 person, so amounts use the smallest product unit of the type: կգ → գ, լ → մլ; count units stay. */
export const recipeUnit = (unit: MeasureUnit): MeasureUnit =>
  convertibleUnits(unit).filter((u) => MEASURE_UNITS[u].isProductUnit).reduce(smaller);
