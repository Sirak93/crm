import { MeasureUnit } from "../enums/MeasureUnit";
import { MEASURE_UNITS } from "../constants/MeasureUnitConstants";

const ALL_UNITS = Object.keys(MEASURE_UNITS).map(Number) as MeasureUnit[];

/** Count units convert only to themselves; weight and volume units to any unit of the same type. */
export const canConvert = (from: MeasureUnit, to: MeasureUnit): boolean =>
    from === to || (MEASURE_UNITS[from].factor !== null && MEASURE_UNITS[from].type === MEASURE_UNITS[to].type);

/** Units an amount in `unit` can be typed in, in list order. */
export const convertibleUnits = (unit: MeasureUnit): MeasureUnit[] => ALL_UNITS.filter((other) => canConvert(other, unit));

/** How many `to` make one `from` (1 մլ → 0.001 լ). Only for units that canConvert. */
export const unitRatio = (from: MeasureUnit, to: MeasureUnit): number =>
    from === to ? 1 : MEASURE_UNITS[from].factor! / MEASURE_UNITS[to].factor!;

/** `value` in `from` turned into `to`, rounded to `decimals` so float noise never shows. */
export const convertQuantity = (value: number, from: MeasureUnit, to: MeasureUnit, decimals: number): number =>
    Number((value * unitRatio(from, to)).toFixed(decimals));
